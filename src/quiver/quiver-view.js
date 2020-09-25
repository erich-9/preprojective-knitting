import "jquery-ui/tooltip";

import $ from "jquery";
import * as d3 from "d3";
import H from "../util/helper";

const toHandle = [
  "initialized",
  "updated",
  "canvasClicked",
  "vertexDragStarted",
  "vertexDragged",
  "vertexDragEnded",
  "vertexClicked",
  "vertexSelected",
  "vertexDeselect",
  "vertexDeselected",
  "vertexAdded",
  "vertexRemove",
  "vertexRemoved",
  "arrowClicked",
  "arrowDeselect",
  "arrowDeselected",
  "arrowAdded",
  "arrowRemove",
  "arrowRemoved"
];

let id = 0;

class QuiverView {
  constructor(quiver, container, config = {}) {
    ++id;

    $.extend(this,
      {
        id, quiver, container,

        showVertexNames: false,
        showArrowNames: true,
        showVertexToolTips: true,
        showArrowToolTips: false,

        handler: {},

        selectedVertex: null,
        selectedArrow: null,

        vertexClicked: false,
        arrowClicked: false,

        defaultSize: { h: 400, w: 800 }
      },
      config
    );

    for (const f of toHandle) {
      if (!this.handler[f])
        this.handler[f] = () => {};
    }

    initConstants.call(this);

    this.update();

    this.handler.initialized.call(this);
  }

  update() {
    const Q = this.quiver,
      [x_min, y_min, w, h] = this.svg.attr("viewBox").split(/\s+/).map(d => Math.floor(d)),
      x_max = x_min + w,
      y_max = y_min + h;

    for (const v of Q.vertices) {
      if (v.x === undefined)
        v.x = H.randomInt(x_min, x_max);
      if (v.y === undefined)
        v.y = H.randomInt(y_min, y_max);
    }

    this.gVGroup = this.gV.selectAll(".vertices g")
      .data(Q.vertices, d => d.id);

    this.gAGroup = this.gA.selectAll(".arrows g")
      .data(Q.arrows, d => d.id);

    // exit: vertices
    this.gVGroup.exit().remove();

    // exit: arrows
    this.gAGroup.exit().remove();

    // enter: vertices
    const gVGroupEnter = this.gVGroup.enter().append("g")
      .on("click", clicked_vertex(this))
      .call(d3.drag()
        .on("start", this.handler.vertexDragStarted(this))
        .on("drag", this.handler.vertexDragged(this))
        .on("end", this.handler.vertexDragEnded(this))
      );

    gVGroupEnter.append("circle")
      .attr("r", this.v_r);

    if (this.showVertexNames) {
      gVGroupEnter.append("text")
        .attr("x", this.vTxt_x)
        .attr("y", this.vTxt_y)
        .text(d => d.toString());
    }

    // enter: arrows
    const gAGroupEnter = this.gAGroup.enter().append("g")
      .on("click", clicked_arrow(this));

    gAGroupEnter.append("path")
      .attr("id", d => `path-${this.id}-${d.id}`)
      .attr("marker-end", d => `url(#arrow-tip${d.trans ? "-trans" : ""}-${this.id})`);

    if (this.showArrowNames) {
      const aTxt = gAGroupEnter.append("text")
        .attr("dx", this.aTxt_dx);

      aTxt.append("textPath")
        .attr("xlink:href", d => `#path-${this.id}-${d.id}`)
        .attr("startOffset", "50%")
        .text(d => d.toString());
    }

    // update + enter: vertices
    this.gVGroup = gVGroupEnter.merge(this.gVGroup)
      .attr("class", d => d.class ? d.class : "")
      .classed("selected", d => d === this.selectedVertex);

    if (this.showVertexToolTips)
      this.gVGroup.attr("title", d => `v${d.id}`);

    // update + enter: arrows
    this.gAGroup = gAGroupEnter.merge(this.gAGroup)
      .classed("trans", d => d.trans)
      .classed("selected", d => d === this.selectedArrow);

    if (this.showArrowToolTips)
      this.gAGroup.attr("title", d => `a${d.id}`);

    transform.call(this);

    this.handler.updated.call(this);
  }

  // [<<] init + update view

  // modify quiver etc. [>>]

  selectVertex(d) {
    this.selectedVertex = d;
    this.selectedArrow = null;

    this.handler.vertexSelected.call(this, d);

    return d;
  }

  selectArrow(a) {
    this.selectedVertex = null;
    this.selectedArrow = a;

    this.handler.arrowSelected.call(this, a);

    return a;
  }

  deselectVertex() {
    this.handler.vertexDeselect.call(this);

    this.selectedVertex = null;

    this.handler.vertexDeselected.call(this);
  }

  deselectArrow() {
    this.handler.arrowDeselect.call(this);

    this.selectedArrow = null;

    this.handler.arrowDeselected.call(this);
  }

  addVertex(x, y, data) {
    const v = this.quiver.addVertex(data);

    if (!v)
      return undefined;

    v.x = x;
    v.y = y;

    this.handler.vertexAdded.call(this, v);

    return v;
  }

  addArrow(s, t, data) {
    const a = this.quiver.addArrow(s, t, data);

    if (!a)
      return undefined;

    this.handler.arrowAdded.call(this, a);

    return a;
  }

  removeVertex(v) {
    if (this.selectedVertex === v)
      this.deselectVertex();

    this.handler.vertexRemove.call(this, v);

    this.quiver.removeVertex(v);

    this.handler.vertexRemoved.call(this);
  }

  removeArrow(a) {
    if (this.selectedArrow === a)
      this.deselectArrow();

    this.handler.arrowRemove.call(this, a);

    this.quiver.removeArrow(a);

    this.handler.arrowRemoved.call(this);
  }

  // [<<] modify quiver etc.

  boundingBox() {
    return this._boundingBox(this.quiver.vertices);
  }

  fitInBox(bb) {
    this.makeBestView(bb);
    this.adjustDimensions(bb);

    return this;
  }

  fitInView() {
    return this.fitInBox(this.boundingBox());
  }

  makeBestView(bb) {
    let cw = this.minViewBoxWidth;
    let ch = this.minViewBoxHeight;

    if (cw) {
      cw = cw();
      if (bb.w < cw) {
        bb.x_min -= (cw - bb.w) / 2;
        bb.w = cw;
      }
    }

    if (ch) {
      ch = ch();
      if (bb.h < ch) {
        bb.y_min -= (ch - bb.h) / 2;
        bb.h = ch;
      }
    }
  }

  adjustDimensions(bb) {
    const w_min = this.minViewBoxWidth, h_min = this.minViewBoxHeight;
    let { x_min, y_min, w, h } = bb;

    this.w = w = !w ? h : w;
    this.h = h = !h ? w : h;

    x_min = !x_min ? 0 : x_min;
    y_min = !y_min ? 0 : y_min;

    if (this.verticallyOriented)
      [x_min, y_min, w, h] = [y_min - h, x_min, h, w];

    $(this.container)
      .width(!w_min && (!h_min || h === h_min()) ? w : null)
      .height(!h_min && (!w_min || w === w_min()) ? h : null);

    this.svg
      .attr("viewBox", [x_min, y_min, w, h].join(" "));

    this.scX = sc(x_min, x_min + w);
    this.scY = sc(y_min, y_min + h);

    return this;
  }

  _boundingBox(V) {
    if (V.length === 0)
      return { x_min: 0, y_min: 0, w: 0, h: 0 };

    const m = this.quiver.m;

    let x_min = V.first().x;
    let y_min = V.first().y;

    let x_max = x_min;
    let y_max = y_min;

    for (const v of V) {
      if (v.x < x_min)
        x_min = v.x;
      else if (v.x > x_max)
        x_max = v.x;

      const m_ = m[v.id][v.id];
      const dy = m_ > 0 ? 1.2 * this.v_r * (Math.floor(m_ / 2) + 1) : 0;

      if (v.y - dy < y_min)
        y_min = v.y - dy;
      if (v.y > y_max)
        y_max = v.y;
    }

    x_min -= 2 * this.v_r;
    y_min -= 2 * this.v_r;

    x_max += 2 * this.v_r;
    y_max += 2 * this.v_r;

    return { x_min, y_min, w: x_max - x_min, h: y_max - y_min };
  }
}

function sc(x_min, x_max) {
  return d3.scaleLinear().domain([x_min, x_max]).range([x_min, x_max]);
}

function initConstants() {
  const that = this;

  this.div = d3.select(this.container);
  this.svg = this.div.append("svg")
    .attr("class", "quiver-view")
    .attr("preserveAspectRatio", "xMidYMid")
    .attr("width", "100%")
    .attr("height", "100%");

  this.adjustDimensions(this.defaultSize);

  this.svg
    .on("click", clicked_svg(this));

  $(this.svg.node())
    .tooltip({
      items: "[title]",
      content() {
        const title = $(this).attr("title");
        const id = title.substr(1);
        const xx = title.substr(0, 1) === "v"
          ? that.quiver.vertices
          : that.quiver.arrows;

        return xx.find(d => String(d.id) === id).toString();
      }
    });

  // arrow tip for svg paths
  this.svgDefs = this.svg.append("svg:defs");

  this.svgMarkers = [];
  this.svgMarkers.push(appendMarker.call(this, this.svgDefs));
  this.svgMarkers.push(appendMarker.call(this, this.svgDefs, "-trans"));

  // circumvent bug in IE 11
  this.svgDefsNode = this.svgDefs.node();
  this.svgMarkerNodes = this.svgMarkers.map(m => m.node());

  const g = this.verticallyOriented
    ? this.svg.append("g").attr("transform", "rotate(90)")
    : this.svg;

  this.gV = g.append("g").attr("class", "vertices");
  this.gA = g.append("g").attr("class", "arrows");

  this.v_r = 10;
  this.vTxt_x = 0.2;
  this.vTxt_y = 4.3;

  this.a_shift = 5;
  this.aTip_shift = 2;
  this.a_pad = 3;
  this.a_bend_pad = 1;
  this.aTxt_dx = 0;
  this.aTxt_dy = -3;
}

function transform() {
  this.gVGroup
    .attr("transform", d => `translate(${this.scX(d.x)},${this.scY(d.y)})`);

  this.gAGroup
    .attr("transform", d => {
      d.dsx = this.scX(d.source.x);
      d.dtx = this.scX(d.target.x);

      d.dsy = this.scY(d.source.y);
      d.dty = this.scY(d.target.y);

      d.dx = d.dtx - d.dsx;
      d.dy = d.dty - d.dsy;

      d.dpc = H.polarCoordinates(d.dx, d.dy);

      return [
        "translate(", d.dsx, d.dsy, ")",
        "rotate(", d.dpc.arg ? d.dpc.arg : 0, ")"
      ].join(" ");
    });

  this.gAGroup.selectAll("path")
    .attr("d", d => {
      const m_ = this.quiver.m[d.target.id][d.source.id];
      let x, y, r;

      if (d.source !== d.target) {
        const dr = d.dpc.r;
        let q = d.m_id;

        y = -q * this.a_shift;

        if (m_ > 0) {
          y -= this.a_shift / 2;
        }
        else if (this.quiver.m[d.source.id][d.target.id] > 1) {
          y += this.a_shift / 2;
          if (d.m_id !== 0)
            --q;
        }

        x = this.v_r + this.a_pad - (q * q * this.a_bend_pad);
        r = q ? dr * dr / q / 150 : 0;

        return [
          "M", x, y,
          "A", r, r, 1, 0, 1, dr - x - this.aTip_shift, y
        ].join(" ");
      }
      else {
        const m_id_d2 = Math.floor(d.m_id / 2);

        y = this.v_r;
        x = this.v_r + (5 * m_id_d2);
        r = 1.2 * this.v_r * (m_id_d2 + 1);

        if (m_ > 1 && d.m_id % 2) {
          return [
            "M", x, y,
            "A", r, r, 1, 1, 1, -x - this.aTip_shift, y
          ].join(" ");
        }
        else {
          return [
            "M", -x, -y,
            "A", r, r, 1, 1, 1, x + this.aTip_shift, -y
          ].join(" ");
        }
      }
    });

  if (this.showArrowNames) {
    this.gAGroup.selectAll("text")
      .attr("dy", d => {
        const dy = this.aTxt_dy;
        const m_ = this.quiver.m[d.target.id][d.source.id];
        const n_ = this.quiver.m[d.source.id][d.target.id];

        if (d.m_id === 0 && m_ === 0 && n_ > 1)
          return -dy + this.a_shift;

        return dy;
      });
  }

  if (H.runningInIE())
    removeAndAppendMarker.call(this);
}

// circumvent bug in IE 11
function removeAndAppendMarker() {
  for (const m of this.svgMarkerNodes) {
    this.svgDefsNode.removeChild(m);
    this.svgDefsNode.appendChild(m);
  }
}

// handle clicks [>>]

function clicked_vertex(that_) {
  return v => {
    that_.vertexClicked = true;

    that_.handler.vertexClicked.call(that_, v);
  };
}

function clicked_arrow(that_) {
  return a => {
    that_.arrowClicked = true;

    that_.handler.arrowClicked.call(that_, a);
  };
}

function clicked_svg(that_) {
  return function(event) {
    if (that_.vertexClicked || that_.arrowClicked) {
      that_.vertexClicked = that_.arrowClicked = false;

      return;
    }

    that_.handler.canvasClicked.call(that_, d3.pointer(event));
  };
}

// [<<] handle clicks

function appendMarker(svgDefs, suffix = "") {
  const svgMarker = svgDefs.append("svg:marker")
    .attr("id", `arrow-tip${suffix}-${this.id}`)
    .attr("class", `arrow-tip${suffix}`)
    .attr("viewBox", "-9 -9 18 18")
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto");

  svgMarker
    .append("polygon")
    .attr("points", "-3,0 -7,7 7,0 -7,-7");

  return svgMarker;
}

export default QuiverView;
