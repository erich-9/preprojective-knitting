import $ from "jquery";
import H from "./util/helper";
import Quiver from "./quiver/quiver";

class PreprojectiveComponent {
  constructor(data, config) {
    $.extend(this,
      {
        dx: 50,
        dy: 25,
        ox: 20,
        oy: 500,
        radical: data.radical,
        positions: data.positions,
        n: Object.keys(data.radical).length,
        quiver: new Quiver(),
        projectiveVertices: [],
        queue: new Set(),
        somethingChanged: true
      },
      config
    );

    this.ndx = this.n * this.dx;

    if (!validateRadicalData.call(this))
      H.throwError("Invalid projectives.");
    if (!validatePositions.call(this))
      H.throwError("Invalid positions.");

    this._radical = $.extend(true, {}, this.radical);

    initProjectiveVertices.call(this);
  }

  populate(maxWidth) {
    const Q = this.quiver;
    const R = this._radical;

    while (
      this.somethingChanged &&
      this.queue.size > 0 &&
      Math.min(...[...this.queue].map(v => v.x)) < maxWidth + this.ndx
    ) {
      this.somethingChanged = false;

      const nextQueue = new Set();

      for (const v of this.queue) {
        if (!v.inArrows.every(a => a.source.translated)) {
          nextQueue.add(v);
          continue;
        }

        // [>>] add radical inclusions
        for (const w of this.projectiveVertices) {
          const i = w.index;
          const r = R[i];

          if (r.length === 0)
            continue;

          for (let j = 0; j < r.length;) {
            if (!equalDimVectors(r[j][1], v.dimVector)) {
              ++j;
              continue;
            }

            addArrowWithMultiplicity.call(this, v, w, r[j][0]);

            recursivelyPushToLayer.call(this, w, v.xLayer + 1);
            recursivelyPullPredecessors.call(this, w);

            r.splice(j, 1);
          }

          if (r.length === 0)
            nextQueue.add(w);
        }
        // [<<] add radical inclusions

        recursivelyPullPredecessors.call(this, v);

        v.translated = true;
        this.somethingChanged = true;

        const d_ = translatedDimVector.call(this, v);

        if (Object.entries(d_).some(x => x[1] < 0)) {
          v.class = `${v.class ? `${v.class} ` : ""}injective`;
        }
        else {
          const v_ = addVertex.call(this, { index: v.index, r: v.r + 1 });

          addTauArrow.call(this, v_, v);
          v.outArrows.forEach(a => {
            addArrowWithMultiplicity.call(this, a.target, v_, a.multiplicity);
          });

          setVertexInfo.call(this, v_, d_);
          updateVertexPositions.call(this, v_, maxLayerBefore.call(this, v_) + 1);

          nextQueue.add(v_);
        }
      }

      this.queue = nextQueue;
    }

    if (this.queue.size > 0) {
      if (!this.somethingChanged)
        this.stuck = true;
    }
    else {
      if (Q.vertices.some(v => !v.translated))
        this.stuck = true;
    }
  }

  moveVertex(v, dx, dy) {
    const p = v.tauDestination;

    if (H.isIntegerInRange(p.y + dy, -1, 2 * this.oy + 1))
      p.tauOrbit.forEach(w => w.y += dy);

    if (p.x + dx >= 0) {
      if (dx < 0 && !this.projectiveVertices.every(q => {
        const dx_ = p.successors.has(q) ? dx : 0;

        return q.inArrows
          .every(a => p.successors.has(a.source) || q.x + dx_ >= a.source.x + this.dx);
      }))
        return;

      p.ox += dx;

      p.successors.forEach(w => w.x += dx);
    }
  }
}

function initProjectiveVertices() {
  for (const i in this.radical) {
    const v = addVertex.call(this),
      d = Object.fromEntries(Object.keys(this.radical).map(
        j => [j, i === j ? 1 : 0]
      ));

    this.projectiveVertices.push(v);

    this.radical[i].forEach(s => {
      for (const j in d) {
        if (j in s[1])
          d[j] += s[0] * s[1][j];
      }
    });

    if (this.radical[i].length === 0)
      this.queue.add(v);

    $.extend(v, {
      index: i,
      r: 0,
      successors: new Set([v]),
      tauOrbit: new Set([v]),
      class: "projective",
      y: this.positions[i].y,
      ox: this.positions[i].ox
    });

    setVertexInfo.call(this, v, d);
    updateVertexPositions.call(this, v, 0);
  }
}

function equalDimVectors(d1, d2) {
  for (const i in d1) {
    if (!((i in d2 && d1[i] === d2[i]) || d1[i] === 0))
      return false;
  }

  for (const i in d2) {
    if (!(i in d1) && d2[i] !== 0)
      return false;
  }

  return true;
}

function translatedDimVector(vertex) {
  const res = Object.fromEntries(Object.keys(vertex.dimVector).map(
    i => [i, -vertex.dimVector[i]]
  ));

  vertex.outArrows.forEach(a => {
    for (const i in res)
      res[i] += a.multiplicity * a.target.dimVector[i];
  });

  return res;
}

function maxLayerBefore(vertex) {
  return Math.max(...vertex.inArrows.map(a => a.source.xLayer));
}

function minLayerAfter(vertex) {
  return Math.min(...vertex.outArrows.map(a => a.target.xLayer));
}

function recursivelyPushToLayer(vertex, xLayer) {
  updateVertexPositions.call(this, vertex, xLayer);
  vertex.outArrows.forEach(a => {
    recursivelyPushToLayer.call(this, a.target, xLayer + 1);
  });
}

function recursivelyPullPredecessors(vertex) {
  vertex.inArrows.forEach(a => {
    const d = minLayerAfter.call(this, a.source) - a.source.xLayer - 1;

    if (d > 0) {
      updateVertexPositions.call(this, a.source, a.source.xLayer + d);
      recursivelyPullPredecessors.call(this, a.source);
    }
  });
}

function updateVertexPositions(vertex, xLayer) {
  vertex.xLayer = xLayer;
  vertex.x = xLayer * this.dx + this.ox;

  this.projectiveVertices.forEach(p => {
    if (p.successors.has(vertex))
      vertex.x += p.ox;
  });

  if (vertex.tau !== undefined)
    vertex.y = vertex.tau.y;
}

function setVertexInfo(vertex, dimVector) {
  vertex.dimVector = dimVector;
  vertex.name = dimVectorToString(dimVector);

  if (vertex.tau === undefined)
    vertex.name = `P<sub>${vertex.index}</sub> = ${vertex.name}`;
}

function addVertex(data) {
  const v = this.quiver.addVertex(data);

  v.inArrows = [];
  v.outArrows = [];

  return v;
}

function addArrowWithMultiplicity(s, t, m) {
  const a = this.quiver.addArrow(s, t);

  a.multiplicity = m;

  this.projectiveVertices.forEach(p => {
    if (p.successors.has(s))
      p.successors.add(t);
  });

  if (t.tau === undefined) {
    t.successors.forEach(v => {
      this.projectiveVertices.forEach(p => {
        if (p.successors.has(t))
          p.successors.add(v);
      });
    });
  }

  s.outArrows.push(a);
  t.inArrows.push(a);
}

function addTauArrow(s, t) {
  this.quiver.addArrow(s, t, { trans: true });

  t.tauDestination.tauOrbit.add(s);
}

function validateRadicalData() {
  const R = this.radical;

  if (!H.isObject(R))
    return false;

  for (const i in R) {
    const x = R[i];

    if (
      !Array.isArray(x) ||
      !x.every(
        y => Array.isArray(y) && y.length === 2 &&
        H.isIntegerInRange(y[0], 0) &&
        Object.entries(y[1]).every(
          z => z[0] in R && H.isIntegerInRange(z[1], -1)
        )
      )
    )
      return false;
  }

  return true;
}

function validatePositions() {
  const R = this.radical,
    P_ = {};

  let P = this.positions,
    available = Array.init(i => i, this.n),
    j = 0;

  if (H.isObject(P)) {
    for (const i in P) {
      if (!(i in R))
        return false;

      const c = H.isString(P[i]),
        m = c ? P[i].match(/^\((-?\d+)\|(-?\d+)\)$/) : null;

      if (!c && !H.isIntegerInRange(P[i]))
        return false;

      if (m !== null) {
        const [y, ox] = [m[1], m[2]].map(z => parseInt(z));

        if (![y, ox].every(z => H.isIntegerInRange(z)))
          return false;

        P_[i] = { y: y + this.oy, ox };
      }
      else {
        const xFloat = parseFloat(P[i]),
          xInt = Math.round(xFloat);

        if (isNaN(xFloat))
          return false;

        if (H.isIntegerInRange(xInt, -1, this.n))
          available[xInt] = null;

        P_[i] = placeToPosition.call(this, xFloat);
      }
    }
  }
  else {
    P = {};
  }

  available = available.filter(x => x !== null);

  for (const i in R) {
    if (!(i in P)) {
      P_[i] = placeToPosition.call(this, available[j]);
      available[j++] = null;
    }
  }

  this.positions = P_;

  return true;
}

function placeToPosition(i) {
  return { y: Math.round((2 * i - this.n + 1) * this.dy + this.oy), ox: 0 };
}

function dimVectorToString(d) {
  return Object.entries(d).map(x =>
    (x[1] > 0 ? H.htmlEscape(x[0]) : "") +
    (x[1] > 1 ? `<sup>${String(x[1])}</sup>` : "")
  ).join("");
}

export default PreprojectiveComponent;
