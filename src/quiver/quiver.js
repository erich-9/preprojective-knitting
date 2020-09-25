import $ from "jquery";
import H from "../util/helper";

function Quiver() {
  const that = this;

  construct();
  exportMethods();

  function construct() {
    that.vertices = [];
    that.arrows = [];

    // adjacency matrix
    that.m = {};

    // loop count
    that.l = 0;
  }

  function exportMethods() {
    that.vertex = vertex;
    that.arrow = arrow;

    that.isEmpty = isEmpty;
    that.arrowMultiplicity = arrowMultiplicity;

    that.addVertex = addVertex;
    that.addArrow = addArrow;
    that._addVertex = _addVertex;
    that._addArrow = _addArrow;
    that.removeVertex = removeVertex;
    that.removeArrow = removeArrow;

    that.vertexIdFunc = x => x;
    that.arrowIdFunc = x => x;
  }

  function vertex(v) {
    return find(that.vertices, v);
  }

  function arrow(a) {
    return find(that.arrows, a);
  }

  function find(data, d) {
    return data.find(e => e === d || e.id === d);
  }

  function isEmpty() {
    return that.vertices.length === 0;
  }

  function arrowMultiplicity(s_id, t_id) {
    return that.m[s_id][t_id];
  }

  function addVertex(data = {}) {
    if (that.vertex(data.id))
      return undefined;

    data.id = data.id === undefined ? freeVertexId() : data.id;

    if (data.id === undefined)
      return undefined;

    data.name = data.name === undefined ? String(data.id) : data.name;

    const vertex = $.extend(
      {
        toString() {
          return this.name;
        }
      },
      data
    );

    return _addVertex(vertex);
  }

  function _addVertex(vertex) {
    that.vertices.push(vertex);

    that.m[vertex.id] = {};
    that.vertices.forEach(d => {
      that.m[vertex.id][d.id] = that.m[d.id][vertex.id] = 0;
    });

    vertex.tauDestination = vertex;

    return vertex;
  }

  function addArrow(source, target, data = { trans: false }) {
    if (that.arrow(data.id))
      return undefined;

    data.id = data.id === undefined ? freeArrowId() : data.id;

    if (data.id === undefined)
      return undefined;

    data.name = data.name === undefined ? String(data.id) : data.name;

    source = that.vertex(source);
    target = that.vertex(target);

    if (!source || !target)
      return undefined;

    const arrow = $.extend(
      {
        source,
        target,
        toString() {
          return this.multiplicity > 1 ? this.multiplicity : null;
        }
      },
      data
    );

    return _addArrow(arrow);
  }

  function _addArrow(arrow) {
    const s = arrow.source;
    const t = arrow.target;

    const s_id = s.id;
    const t_id = t.id;

    arrow.m_id = that.m[s_id][t_id];

    that.arrows.push(arrow);

    ++that.m[s_id][t_id];

    if (s_id === t_id)
      ++that.l;

    if (arrow.trans) {
      s.tau = t;
      s.tauDestination = t.tauDestination;
    }

    return arrow;
  }

  function removeVertex(v) {
    v = that.vertex(v);

    that.arrows.forEach(arrow => {
      if (arrow.source === v || arrow.target === v)
        that.removeArrow(arrow);
    });

    that.vertices = that.vertices.filter(w => w !== v);

    that.m[v.id] = null;
    that.vertices.forEach(w => {
      that.m[w.id][v.id] = null;
    });
  }

  function removeArrow(a) {
    a = that.arrow(a);

    that.arrows = that.arrows.filter(arrow => arrow !== a);

    that.arrows.forEach(b => {
      if (b.source === a.source && b.target === a.target) {
        if (b.m_id > a.m_id)
          --b.m_id;
      }
    });

    --that.m[a.source.id][a.target.id];

    if (a.source.id === a.target.id)
      --that.l;
  }

  function freeVertexId() {
    return freeId(that.vertices, that.vertexIdFunc);
  }

  function freeArrowId() {
    return freeId(that.arrows, that.arrowIdFunc);
  }
}

function freeId(inUse, possibleIds) {
  const ids = [];

  for (let i = inUse.length; i >= 0; --i)
    ids.insertSorted(possibleIds(i), H.compare);
  inUse.forEach(d => ids.binaryFindAndRemove(d.id, H.compare));

  return ids.first();
}

export default Quiver;
