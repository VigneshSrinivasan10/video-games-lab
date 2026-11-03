/* Shared geometry merger; original procedural architecture. */
window.CityGeometry={create({T,scene,environment}){
    const M = environment.materials, cache = new Map(), roots = [], stats = { triangles: 0, meshes: 0, banks: 0, naturalBanks: 0, bridges: 0 };
    const geometry = (key, create) => { if (!cache.has(key)) cache.set(key, create()); return cache.get(key); };
    const shadedMaterials=new Map();
    const cube = geometry('box', () => new T.BoxGeometry(1, 1, 1));
    function kit(name, x, z, rotation = 0) {
      const root = new T.Group(); root.name = name; root.position.set(x, 0, z); root.rotation.y = rotation; scene.add(root); roots.push(root);
      const bins = new Map(), transform = new T.Object3D(), normalMatrix = new T.Matrix3(), p = new T.Vector3(), n = new T.Vector3();
      function bin(mat) { if(!shadedMaterials.has(mat.uuid)){const shaded=mat.clone();shaded.vertexColors=true;shaded.onBeforeCompile=mat.onBeforeCompile;shaded.customProgramCacheKey=mat.customProgramCacheKey;shadedMaterials.set(mat.uuid,shaded);}if (!bins.has(mat.uuid)) bins.set(mat.uuid, { mat:shadedMaterials.get(mat.uuid), p: [], n: [], uv: [], c: [] }); return bins.get(mat.uuid); }
      function put(b, point, normal, u, v) {
        b.p.push(point.x, point.y, point.z); b.n.push(normal.x, normal.y, normal.z); const ao=(normal.y < -.3 ? .63 : 1)*(point.y < 1.2 ? .8 : 1); b.c.push(ao,ao,ao);
        if (b.mat.userData.worldUV) b.uv.push((Math.abs(normal.z) > .5 ? point.x : point.z) / 2, (Math.abs(normal.y) > .5 ? point.x : point.y) / 2);
        else b.uv.push(u, v);
      }
      function stamp(g, mat, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) {
        const b = bin(mat), pos = g.attributes.position, norm = g.attributes.normal, uv = g.attributes.uv;
        transform.position.set(x, y, z); transform.rotation.set(rx, ry, rz); transform.scale.set(sx, sy, sz); transform.updateMatrix(); normalMatrix.getNormalMatrix(transform.matrix);
        for (let j = 0; j < (g.index?.count || pos.count); j++) { const i = g.index ? g.index.getX(j) : j; p.fromBufferAttribute(pos, i).applyMatrix4(transform.matrix); n.fromBufferAttribute(norm, i).applyMatrix3(normalMatrix).normalize(); put(b, p, n, uv?.getX(i) || 0, uv?.getY(i) || 0); }
      }
      function tri(points, mat) {
        const b = bin(mat), a = new T.Vector3(...points[0]), normal = new T.Vector3(...points[1]).sub(a).cross(new T.Vector3(...points[2]).sub(a));
        if (normal.lengthSq() < 1e-12) return; normal.normalize();
        points.forEach((point, i) => put(b, new T.Vector3(...point), normal, i === 2 ? 1 : 0, i === 0 ? 0 : 1));
      }
      const box = (x, y, z, w, h, d, mat = M.stone, ry = 0) => stamp(cube, mat, x, y, z, w, h, d, ry);
      const cyl = (x, y, z, r, h, mat = M.stone, top = r, segments = 32) => stamp(geometry(`cyl:${top / r}:${segments}`, () => new T.CylinderGeometry(top / r, 1, 1, segments)), mat, x, y, z, r, h, r);
      const sphere = (x, y, z, rx, ry, rz, mat) => stamp(geometry('sphere', () => new T.SphereGeometry(1, 24, 14)), mat, x, y, z, rx, ry, rz);
      const ring = (x, y, z, r, tube, mat = M.trim) => stamp(geometry(`ring:${r}:${tube}`, () => new T.TorusGeometry(r, tube, 5, 64)), mat, x, y, z, 1, 1, 1, 0, Math.PI / 2);
      function beam(a, b, radius, mat = M.frame) {
        const delta = new T.Vector3(...b).sub(new T.Vector3(...a)), mid = new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5);
        const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.clone().normalize()), e = new T.Euler().setFromQuaternion(q);
        stamp(geometry('beam', () => new T.CylinderGeometry(1, 1, 1, 6)), mat, mid.x, mid.y, mid.z, radius, delta.length(), radius, e.y, e.x, e.z);
      }
      function arch(x, y, z, radius, straight, mat, depth = .2, ry = 0) {
        const key = `arch:${radius}:${straight}:${depth}`;
        const g = geometry(key, () => { const s = new T.Shape(); s.moveTo(-radius, 0); s.lineTo(radius, 0); s.lineTo(radius, straight); s.absarc(0, straight, radius, 0, Math.PI, false); s.closePath(); return new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 16 }); });
        stamp(g, mat, x, y, z, 1, 1, 1, ry);
      }
      function archFrame(x, y, z, radius, straight, thickness = .22, ry = 0) {
        const key = `arch-frame:${radius}:${thickness}`;
        const g = geometry(key, () => { const s = new T.Shape(); s.moveTo(-radius, 0); s.absarc(0, 0, radius, Math.PI, 0, true); s.lineTo(radius - thickness, 0); s.absarc(0, 0, radius - thickness, 0, Math.PI, false); s.closePath(); return new T.ExtrudeGeometry(s, { depth: .35, bevelEnabled: false, curveSegments: 16 }); });
        stamp(g, M.trim, x, y + straight, z, 1, 1, 1, ry);
        for (const side of [-1, 1]) box(x + Math.cos(ry) * side * (radius - thickness / 2), y + straight / 2, z - Math.sin(ry) * side * (radius - thickness / 2), thickness, straight, .35, M.trim, ry);
      }
      function finish() {
        for (const b of bins.values()) {
          const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2)); g.setAttribute('color',new T.Float32BufferAttribute(b.c,3)); g.computeBoundingSphere();
          const mesh = new T.Mesh(g, b.mat); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); stats.meshes++; stats.triangles += b.p.length / 9;
        }
        root.updateMatrixWorld(true);const bounds=new T.Sphere();bounds.makeEmpty();for(const mesh of root.children)bounds.union(mesh.geometry.boundingSphere.clone().applyMatrix4(mesh.matrixWorld));root.userData.sceneryBounds=bounds;
        bins.clear();
      }
      return { root, stamp, tri, box, cyl, sphere, ring, beam, arch, archFrame, finish };
    }

    return {M,cache,roots,stats,geometry,kit};
}};
