import { useEffect, useRef, useState } from "react";

export default function FlowScene() {
  const host = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const message = useRef<HTMLSpanElement>(null);
  const meta = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    void Promise.all([import("three"), import("three/examples/jsm/lines/Line2.js"), import("three/examples/jsm/lines/LineMaterial.js"), import("three/examples/jsm/lines/LineGeometry.js")]).then(([T, { Line2 }, { LineMaterial }, { LineGeometry }]) => {
      if (cancelled) return;
      try {
        const color = (token: string) => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext("2d");
          if (!ctx) return new T.Color();
          ctx.fillStyle = getComputedStyle(container).getPropertyValue(token).trim();
          ctx.fillRect(0, 0, 1, 1);
          const pixel = ctx.getImageData(0, 0, 1, 1).data;
          return new T.Color(`rgb(${pixel[0]},${pixel[1]},${pixel[2]})`);
        };
        const ink = color("--landing-ink");
        const water = color("--flow-water");
        const light = color("--landing-surface");
        const signal = color("--flow-signal");
        const active = color("--flow-signal-active");
        const scene = new T.Scene();
        const camera = new T.OrthographicCamera(-8, 8, 4.2, -4.2, .1, 100);
        camera.position.set(9, 12, 14);
        camera.lookAt(0, 0, 0);
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearColor(light, 0);
        container.appendChild(renderer.domElement);
        renderer.domElement.setAttribute("aria-label", "Simulated three-dimensional water network with flowing water and occasional monitoring events");
        renderer.domElement.setAttribute("role", "img");
        scene.add(new T.AmbientLight(light, 2.2));
        const sun = new T.DirectionalLight(light, 3);
        sun.position.set(3, 10, 6);
        scene.add(sun);
        const network = new T.Group();
        scene.add(network);
        // Contours are screen-space lines so stroke weight stays constant at every size.
        const contour = new LineMaterial({ color: ink.getHex(), linewidth: 1.7, transparent: true, opacity: .85 });
        const outline = new T.LineBasicMaterial({ color: ink, transparent: true, opacity: .85 });
        const shell = new T.MeshPhysicalMaterial({ color: light, transparent: true, opacity: .23, roughness: .15, metalness: .1, side: T.DoubleSide, depthWrite: false });
        // Invisible depth mask: hides contour segments that pass behind or inside another pipe.
        const mask = new T.MeshBasicMaterial({ colorWrite: false, transparent: true });
        const solid = new T.MeshStandardMaterial({ color: light, roughness: .3, metalness: .15 });
        const rim = new T.MeshBasicMaterial({ color: ink });
        const curveFrom = (points: number[][]) => new T.CatmullRomCurve3(points.map(p => new T.Vector3(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0)), false, "centripetal");
        const trunk = curveFrom([
          [-8,0,1.8],[-3.8,0,1.8],[-3,0,1.8],[-2.6,0,1.4],[-2.6,0,-1.6],[-2.2,0,-2],[-1.4,0,-2],[2.5,0,-2],[3.2,0,-1.6],[3.2,0,1.5],[3.7,0,2],[8,0,2],
        ]);
        // Branches start on the actual interpolated trunk, not approximated coordinates.
        const junctions = [.24, .47, .72].map(t => trunk.getPointAt(t));
        const branch = (anchor: InstanceType<typeof T.Vector3>, points: number[][]) => curveFrom([[anchor.x,anchor.y,anchor.z], ...points]);
        const view = camera.position.clone().normalize();
        const curves = [trunk,
          branch(junctions[0] ?? new T.Vector3(), [[-1.6,0,.6],[.5,0,.6],[1.1,0,1.1],[1.1,0,4.5]]),
          branch(junctions[1] ?? new T.Vector3(), [[.2,0,-3.6],[.7,0,-4.2],[5.5,0,-4.2]]),
          branch(junctions[2] ?? new T.Vector3(), [[4.5,0,-.6],[5,0,-1.1],[5,0,-4.4]]),
        ];
        const flows: InstanceType<typeof T.ShaderMaterial>[] = [];
        curves.forEach((curve, index) => {
          const length = curve.getLength();
          const fluid = new T.ShaderMaterial({
            transparent: true, depthWrite: false,
            uniforms: { time: { value: 0 }, length: { value: length }, water: { value: water }, light: { value: light }, signal: { value: active }, scan: { value: -1 }, phase: { value: index === 0 ? 0 : trunk.getLength() * ([.24, .47, .72][index - 1] ?? 0) } },
            vertexShader: `varying vec2 flowUv; void main() { flowUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform float time; uniform float length; uniform float phase; uniform float scan; uniform vec3 water; uniform vec3 light; uniform vec3 signal; varying vec2 flowUv;
              void main() {
                float travel = flowUv.x * length - time * 1.35 + phase;
                float band = pow(0.5 + 0.5 * cos(travel * 4.5 + sin(flowUv.y * 6.283) * 0.22), 9.0);
                float contour = pow(0.5 + 0.5 * cos(flowUv.y * 6.283), 3.0);
                float pulse = scan < 0.0 ? 0.0 : (1.0 - smoothstep(0.0, 0.075, abs(flowUv.x - scan)));
                vec3 tint = mix(water, light, band * 0.78 + contour * 0.12);
                tint = mix(tint, signal, pulse * 0.85);
                gl_FragColor = vec4(tint, 0.6 + band * 0.35 + pulse * 0.05);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
              }`,
          });
          flows.push(fluid);
          const add = (mesh: InstanceType<typeof T.Object3D>, order: number) => { mesh.renderOrder = order; network.add(mesh); };
          add(new T.Mesh(new T.TubeGeometry(curve, 160, .235, 14, false), fluid), 1);
          add(new T.Mesh(new T.TubeGeometry(curve, 160, .32, 18, false), shell), 2);
          add(new T.Mesh(new T.TubeGeometry(curve, 160, .3, 18, false), mask), 3);
          // True silhouette for an orthographic view: offset perpendicular to both the path tangent and view direction.
          for (const sign of [1, -1]) {
            const positions: number[] = [];
            for (let i = 0; i <= 200; i++) {
              const t = i / 200;
              const side = curve.getTangent(t).cross(view).normalize().multiplyScalar(.322 * sign);
              const point = curve.getPoint(t).add(side);
              positions.push(point.x, point.y, point.z);
            }
            const geometry = new LineGeometry();
            geometry.setPositions(positions);
            const line = new Line2(geometry, contour);
            line.computeLineDistances();
            add(line, 4);
          }
          // Branch inlets are open junctions; only exposed ends receive a rim.
          for (const t of index === 0 ? [0, 1] : [1]) {
            const ring = new T.Mesh(new T.TorusGeometry(.322, .011, 6, 48), rim);
            ring.renderOrder = 4;
            ring.position.copy(curve.getPoint(t));
            ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1), curve.getTangent(t));
            network.add(ring);
          }
        });
        const sensors: { group: InstanceType<typeof T.Group>; indicator: InstanceType<typeof T.Mesh>; material: InstanceType<typeof T.MeshBasicMaterial>; glow: InstanceType<typeof T.MeshBasicMaterial>; halo: InstanceType<typeof T.Mesh>; curve: number; t: number }[] = [];
        for (const [curveIndex, t] of [[0,.31],[0,.56],[0,.77],[2,.34]]) {
          const curve = curves[curveIndex ?? 0];
          if (!curve || t === undefined) continue;
          const group = new T.Group();
          group.position.copy(curve.getPointAt(t));
          group.quaternion.setFromUnitVectors(new T.Vector3(1,0,0), curve.getTangentAt(t));
          const saddle = new T.Mesh(new T.TorusGeometry(.33,.032,8,32), solid);
          saddle.rotation.y = Math.PI / 2;
          group.add(saddle);
          const body = new T.Mesh(new T.BoxGeometry(.56,.22,.48), solid);
          body.position.y = .36;
          const edges = new T.LineSegments(new T.EdgesGeometry(body.geometry), outline);
          edges.position.copy(body.position);
          group.add(body, edges);
          const material = new T.MeshBasicMaterial({ color: signal.clone(), transparent: true, opacity: .45 });
          const indicator = new T.Mesh(new T.CylinderGeometry(.09,.09,.018,24), material);
          indicator.position.y = .48;
          group.add(indicator);
          const glow = new T.MeshBasicMaterial({ color: active, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
          const halo = new T.Mesh(new T.RingGeometry(.3, .62, 48), glow);
          halo.rotation.x = -Math.PI / 2;
          halo.position.y = .02;
          group.add(halo);
          network.add(group);
          sensors.push({ group, indicator, material, glow, halo, curve: curveIndex ?? 0, t });
        }
        // Irregular 8 to 15 second spacing, one sensor at a time.
        const events = [
          { at: 4, sensor: 0, text: "Pressure anomaly detected", meta: "Sensor 01 · Main line" },
          { at: 16, sensor: 3, text: "Pressure anomaly detected", meta: "Sensor 04 · Distribution branch" },
          { at: 25.5, sensor: 2, text: "Upstream reading confirmed", meta: "Sensor 03 · Main line" },
          { at: 39, sensor: 1, text: "Pressure stabilized", meta: "Sensor 02 · Monitoring resumed" },
          { at: 48.5, sensor: 3, text: "Sampling recommended", meta: "Sensor 04 · Awaiting review" },
        ];
        let pointerX = 0, pointerY = 0;
        const move = (event: PointerEvent) => {
          const rect = container.getBoundingClientRect();
          pointerX = ((event.clientX - rect.left) / rect.width - .5) * .045;
          pointerY = ((event.clientY - rect.top) / rect.height - .5) * .025;
        };
        const leave = () => { pointerX = pointerY = 0; };
        container.addEventListener("pointermove", move);
        container.addEventListener("pointerleave", leave);
        const resize = () => {
          const width = container.clientWidth, height = container.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height);
          contour.resolution.set(width, height);
          const aspect = width / height;
          const extent = Math.max(3.8, (width < 600 ? 6.8 : 7.4) / aspect);
          camera.left = -extent * aspect;
          camera.right = extent * aspect;
          camera.top = extent;
          camera.bottom = -extent;
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const visibility = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; });
        let visible = true;
        visibility.observe(container);
        let time = 0, previous = performance.now(), frame = 0;
        const projected = new T.Vector3();
        const render = () => {
          const now = performance.now();
          const dt = Math.min((now - previous) / 1000, 1);
          previous = now;
          if (visible && !document.hidden) {
            if (!reduced) time += dt;
            const cycle = time % 61;
            flows.forEach(flow => { if (flow.uniforms['time']) flow.uniforms['time'].value = time; if (flow.uniforms['scan']) flow.uniforms['scan'].value = -1; });
            sensors.forEach(sensor => { sensor.material.opacity = .45; sensor.material.color.copy(signal); sensor.glow.opacity = 0; sensor.indicator.scale.setScalar(1); });
            const event = reduced ? undefined : events.find(event => cycle >= event.at && cycle < event.at + 5.5);
            const sensor = event ? sensors[event.sensor] : undefined;
            const age = event ? cycle - event.at : 0;
            network.rotation.y += ((reduced ? 0 : pointerX) - network.rotation.y) * (1 - Math.exp(-3 * dt));
            network.rotation.x += ((reduced ? 0 : pointerY) - network.rotation.x) * (1 - Math.exp(-3 * dt));
            if (event && sensor) {
              const fade = Math.min(1, Math.max(0, (5.5 - age) / 1.4));
              const lit = Math.sin(Math.min(age / 1.2, 1) * Math.PI / 2) * fade;
              sensor.material.opacity = .45 + .55 * lit;
              sensor.material.color.copy(signal).lerp(active, lit);
              sensor.indicator.scale.setScalar(1 + .25 * lit);
              const bloom = Math.min(1, Math.max(0, (age - .5) / 1)) * fade;
              sensor.glow.opacity = .42 * bloom;
              sensor.halo.scale.setScalar(.85 + .15 * bloom);
              const flow = flows[sensor.curve];
              if (flow?.uniforms['scan'] && age > .9 && age < 3.4) flow.uniforms['scan'].value = sensor.t + (age - .9) * .07;
            }
            renderer.render(scene, camera);
            container.dataset['sceneReady'] = "true";
            container.dataset['flowTime'] = time.toFixed(2);
            if (popup.current) {
              const show = Boolean(event && sensor && age > 1.1 && age < 5.3);
              popup.current.dataset['visible'] = show ? "true" : "false";
              if (show && event && sensor) {
                sensor.group.getWorldPosition(projected);
                projected.y += .6;
                projected.project(camera);
                const width = container.clientWidth, height = container.clientHeight;
                const left = Math.max(16, Math.min(width - 224, (projected.x * .5 + .5) * width + 16));
                const top = Math.max(20, Math.min(height - 80, (-projected.y * .5 + .5) * height - 62));
                popup.current.style.transform = `translate3d(${left}px, ${top}px, 0)`;
                if (message.current) message.current.textContent = event.text;
                if (meta.current) meta.current.textContent = event.meta;
              }
            }
          }
          if (!reduced) frame = requestAnimationFrame(render);
        };
        render();
        dispose = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          visibility.disconnect();
          container.removeEventListener("pointermove", move);
          container.removeEventListener("pointerleave", leave);
          const materials = new Set<InstanceType<typeof T.Material>>();
          scene.traverse(object => {
            if (object instanceof T.Mesh || object instanceof T.Line || object instanceof Line2) {
              object.geometry.dispose();
              (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
            }
          });
          materials.forEach(material => material.dispose());
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch { setFailed(true); }
    }).catch(() => setFailed(true));
    return () => { cancelled = true; dispose?.(); };
  }, []);
  return <div ref={host} className="flow-scene">
    <div ref={popup} className="sensor-event" data-visible="false"><div className="sensor-event-inner"><span className="sensor-event-dot" aria-hidden="true" /><span className="sensor-event-text"><span ref={message} className="sensor-event-message" /><span ref={meta} className="sensor-event-meta" /><span className="sensor-event-kind">Simulated</span></span></div></div>
    {failed && <div className="scene-fallback"><span /><span /><span /></div>}
  </div>;
}
