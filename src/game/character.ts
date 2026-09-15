import * as THREE from "three";
import { COLORS } from "./config";
import { type HatId, hatById } from "./hats";

const BODY = new THREE.MeshBasicMaterial({ color: COLORS.ink });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

export class Runner {
  root = new THREE.Group();
  private hatRoot = new THREE.Group();
  private hatMat: THREE.MeshBasicMaterial;
  private bandMat: THREE.MeshBasicMaterial;
  private legL: THREE.Mesh;
  private legR: THREE.Mesh;
  private armL: THREE.Mesh;
  private armR: THREE.Mesh;
  private torso: THREE.Mesh;
  private head: THREE.Mesh;
  private squash = 1;
  hatId: HatId = "fedora";

  constructor() {
    this.hatMat = new THREE.MeshBasicMaterial({ color: hatById("fedora").color });
    this.bandMat = new THREE.MeshBasicMaterial({ color: COLORS.ink });

    this.legL = mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.11, 8), BODY);
    this.legR = mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.11, 8), BODY);
    this.legL.position.set(-0.038, 0.055, 0);
    this.legR.position.set(0.038, 0.055, 0);

    this.torso = mesh(new THREE.CapsuleGeometry(0.055, 0.08, 4, 8), BODY);
    this.torso.position.y = 0.16;

    this.head = mesh(new THREE.SphereGeometry(0.055, 12, 10), BODY);
    this.head.position.y = 0.255;

    this.armL = mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.1, 6), BODY);
    this.armR = mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.1, 6), BODY);
    this.armL.position.set(-0.08, 0.18, 0);
    this.armR.position.set(0.08, 0.18, 0);

    this.hatRoot.position.y = 0.3;
    this.buildHat("fedora");

    this.root.add(this.legL, this.legR, this.torso, this.head, this.armL, this.armR, this.hatRoot);
    this.root.scale.setScalar(1.85);
  }

  setHat(id: HatId) {
    if (id === this.hatId) return;
    this.hatId = id;
    this.buildHat(id);
  }

  private buildHat(id: HatId) {
    while (this.hatRoot.children.length) {
      const ch = this.hatRoot.children[0]!;
      this.hatRoot.remove(ch);
      if (ch instanceof THREE.Mesh) {
        ch.geometry.dispose();
      }
    }
    const def = hatById(id);
    this.hatMat.color.setHex(def.color);
    this.hatId = id;

    const brim = (r: number, t = 0.012) => {
      const m = mesh(new THREE.CylinderGeometry(r, r, t, 20), this.hatMat);
      m.position.y = 0;
      return m;
    };
    const crown = (rTop: number, rBot: number, h: number, y: number) => {
      const m = mesh(new THREE.CylinderGeometry(rTop, rBot, h, 16), this.hatMat);
      m.position.y = y;
      return m;
    };

    switch (id) {
      case "fedora": {
        this.hatRoot.add(brim(0.12));
        this.hatRoot.add(crown(0.05, 0.07, 0.07, 0.04));
        const dent = mesh(new THREE.SphereGeometry(0.05, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.hatMat);
        dent.position.y = 0.068;
        dent.scale.set(1, 0.35, 0.85);
        this.hatRoot.add(dent);
        const band = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.014, 16), this.bandMat);
        band.position.y = 0.018;
        this.hatRoot.add(band);
        this.hatRoot.rotation.z = -0.18;
        this.hatRoot.rotation.x = -0.08;
        break;
      }
      case "porkpie": {
        this.hatRoot.add(brim(0.1, 0.014));
        this.hatRoot.add(crown(0.068, 0.07, 0.045, 0.028));
        const top = mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.01, 16), this.hatMat);
        top.position.y = 0.05;
        this.hatRoot.add(top);
        this.hatRoot.rotation.z = -0.1;
        this.hatRoot.rotation.x = 0;
        break;
      }
      case "beret": {
        const puff = mesh(new THREE.SphereGeometry(0.09, 14, 10), this.hatMat);
        puff.scale.set(1, 0.38, 1);
        puff.position.set(0.02, 0.02, 0);
        this.hatRoot.add(puff);
        const stem = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), this.hatMat);
        stem.position.set(0.04, 0.05, 0);
        this.hatRoot.add(stem);
        this.hatRoot.rotation.z = -0.28;
        this.hatRoot.rotation.x = 0.05;
        break;
      }
      case "boater": {
        this.hatRoot.add(brim(0.13, 0.01));
        this.hatRoot.add(crown(0.07, 0.07, 0.05, 0.03));
        const band = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.016, 16), this.bandMat);
        band.position.y = 0.016;
        this.hatRoot.add(band);
        this.hatRoot.rotation.z = 0;
        this.hatRoot.rotation.x = 0;
        break;
      }
      case "bowler": {
        this.hatRoot.add(brim(0.1, 0.012));
        const dome = mesh(new THREE.SphereGeometry(0.072, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.6), this.hatMat);
        dome.position.y = 0.01;
        this.hatRoot.add(dome);
        this.hatRoot.rotation.z = -0.08;
        this.hatRoot.rotation.x = 0;
        break;
      }
      case "newsboy": {
        const cap = mesh(new THREE.SphereGeometry(0.085, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), this.hatMat);
        cap.scale.set(1, 0.7, 1.05);
        cap.position.y = 0.01;
        this.hatRoot.add(cap);
        const visor = mesh(new THREE.BoxGeometry(0.12, 0.012, 0.07), this.hatMat);
        visor.position.set(0, 0.0, 0.07);
        visor.rotation.x = -0.15;
        this.hatRoot.add(visor);
        this.hatRoot.rotation.z = -0.06;
        this.hatRoot.rotation.x = 0.12;
        break;
      }
    }
  }

  update(dt: number, opts: {
    grounded: boolean;
    vy: number;
    t: number;
    bpm: number;
    trip: number;
    dead: boolean;
    won: boolean;
  }) {
    const { grounded, vy, t, bpm, trip, dead, won } = opts;
    const run = grounded && !dead && !won ? t * (bpm / 60) * Math.PI * 2 : 0;
    const amp = grounded ? 0.72 : 0.15;
    this.legL.rotation.x = Math.sin(run) * amp;
    this.legR.rotation.x = Math.sin(run + Math.PI) * amp;
    this.armL.rotation.x = Math.sin(run + Math.PI) * (amp * 0.7);
    this.armR.rotation.x = Math.sin(run) * (amp * 0.7);
    this.armL.rotation.z = 0.35;
    this.armR.rotation.z = -0.35;

    const wantSquash = !grounded && vy > 0 ? 1.12 : !grounded ? 0.92 : 1;
    this.squash += (wantSquash - this.squash) * (1 - Math.exp(-12 * dt));
    this.root.scale.set(1.85 / this.squash, 1.85 * this.squash, 1.85 / this.squash);

    if (trip > 0) {
      this.root.rotation.z = Math.sin(t * 28) * 0.35 * Math.min(1, trip * 3);
      this.hatRoot.rotation.y = Math.sin(t * 18) * 0.4;
    } else if (dead) {
      this.root.rotation.z += (1.2 - this.root.rotation.z) * (1 - Math.exp(-5 * dt));
      this.root.rotation.x += (0.4 - this.root.rotation.x) * (1 - Math.exp(-4 * dt));
    } else if (won) {
      this.root.rotation.z += (0 - this.root.rotation.z) * (1 - Math.exp(-6 * dt));
      this.armL.rotation.z = 2.2;
      this.armR.rotation.z = -2.2;
    } else {
      this.root.rotation.z += (0 - this.root.rotation.z) * (1 - Math.exp(-8 * dt));
      this.root.rotation.x += (0 - this.root.rotation.x) * (1 - Math.exp(-8 * dt));
      this.hatRoot.rotation.y += (0 - this.hatRoot.rotation.y) * (1 - Math.exp(-6 * dt));
    }
  }
}
