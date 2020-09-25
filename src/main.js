import "jquery-ui/button";
import "jquery-ui/dialog";

import $ from "jquery";
import Examples from "./examples";
import E from "./export";
import H from "./util/helper";
import PreprojectiveComponent from "./preprojective-component";
import QuiverView from "./quiver/quiver-view";

const howManyPixelsMore = 1000;

const content = $("#content"),
  positionLink = $("#link"),
  exportAsLatexButton = $("#export-as-latex"),
  exportAsPDFButton = $("#export-as-pdf"),
  errorDialog = $("#error-dialog").dialog({
    autoOpen: false,
    dialogClass: "error-dialog",
    height: "auto",
    modal: true,
    position: { my: "center", at: "center", of: window },
    resizable: false,
    width: 380
  }),
  errorMessage = $("#error-message"),
  searchParams = new URLSearchParams(window.location.search);

let PPC, QV,
  stuckErrorThrown = false;

$(() => {
  let A = {};

  trialOrError(() => {
    const radical = radicalFromString(searchParams.get("projectives")),
      positions = positionsFromString(searchParams.get("positions")),
      verticallyOriented = searchParams.get("orientation") === "vertical";

    if (radical !== null) {
      A = { radical, positions };
    }
    else {
      let exampleKey = searchParams.get("example");
      const isValidKey = exampleKey in Examples;

      if (!isValidKey) {
        exampleKey = H.randomKey(Examples);
        searchParams.set("example", exampleKey);
      }

      A = Examples[exampleKey];

      if (isValidKey && positions !== null)
        A.positions = positions;
    }

    const yWindow = verticallyOriented ? $(window).width() : $(window).height(),
      oy = Math.floor((yWindow - 80) / 2);

    PPC = new PreprojectiveComponent(A, { oy });

    QV = new QuiverView(PPC.quiver, $("#ar-quiver")[0], {
      defaultSize: { h: 2 * oy, w: 1 },
      verticallyOriented,
      handler: {
        vertexDragged(that_) {
          return (event, v) => {
            PPC.moveVertex(v,
              Math.round(event.x - v.x),
              Math.round(event.y - v.y)
            );
            that_.update();
          };
        },
        updated() {
          const positionsData = PPC.projectiveVertices
            .map(v => `${v.index}:(${v.y - PPC.oy}|${v.ox})`)
            .join(",");

          searchParams.set("positions", positionsData);

          const queryString = searchParams.toString().replaceMulti(
            { "%3A": ":", "%2C": ",", "%7C": "|", "%28": "(", "%29": ")" }
          );

          positionLink
            .attr("href", `?${queryString}`)
            .text(positionsData.replace(/,/g, " "));

          adjustSize(PPC, this);
        }
      }
    });

    exportAsLatexButton.click(() =>
      E.exportToLatex(PPC, QV, { verticallyOriented })
    );

    exportAsPDFButton.click(() =>
      E.exportToPDF(PPC, QV, { verticallyOriented })
    );

    $(window).resize(() => trialOrError(() => updateSize(PPC, QV)));

    content
      .css("overflow-x", verticallyOriented ? "hidden" : "auto")
      .css("overflow-y", verticallyOriented ? "auto" : "hidden")
      .scroll(() => {
        if (endOfScrollReached(verticallyOriented))
          trialOrError(() => update(PPC, QV, QV.w + howManyPixelsMore));
      });

    updateSize(PPC, QV);
  });
});

function updateSize(PPC, QV) {
  const width = 1.5 * content.width();

  if (width > QV.w)
    update(PPC, QV, width);
}

function update(PPC, QV, width = null) {
  PPC.populate(width === null ? QV.w : width);
  QV.update();

  adjustSize(PPC, QV);

  if (PPC.stuck && !stuckErrorThrown) {
    stuckErrorThrown = true;
    H.throwError("Unfinished knitting.");
  }
}

function adjustSize(PPC, QV) {
  const bb = QV.boundingBox();
  let w = bb.x_min + bb.w;

  PPC.queue.forEach(v => {
    if (w > v.x - PPC.ndx)
      w = v.x - PPC.ndx;
  });

  QV.adjustDimensions({ h: QV.h, w: Math.max(1, w) });
}

function radicalFromString(str) {
  if (str === null)
    return null;

  let res = str
    .split(",")
    .map(x => x.split(":"));

  res.forEach(y => {
    if (y.length !== 2 || !H.isAlphanumericCharacter(y[0]))
      H.throwError("Invalid projectives.");
  });

  res = res
    .map(y =>
      [
        y[0],
        toSummands(
          y[1].split(" ").map(z => toDimVector(z.split("")))
        )
      ]
    );

  return Object.fromEntries(res);
}

function toSummands(xs) {
  return H
    .count(xs, H.equalObjects)
    .filter(x => Object.keys(x[1]).length > 0);
}

function toDimVector(xs) {
  const res = {};

  xs.forEach(x => {
    if (x in res)
      ++res[x];
    else if (!H.isAlphanumericCharacter(x))
      H.throwError("Invalid projectives.");
    else
      res[x] = 1;
  });

  return res;
}

function positionsFromString(str) {
  if (str === null)
    return null;

  let res = str
    .split(",")
    .map(x => x.split(":"));

  res.forEach(y => {
    if (y.length !== 2)
      H.throwError("Invalid positions.");
  });

  res = res.map(y => [y[0], y[1]]);

  return Object.fromEntries(res);
}

function endOfScrollReached(verticallyOriented) {
  const c = content[0],
    [scrollPos, scrollLength, offset] = verticallyOriented
      ? [c.scrollTop, c.scrollHeight, c.offsetHeight]
      : [c.scrollLeft, c.scrollWidth, c.offsetWidth];

  return scrollPos + offset >= scrollLength - howManyPixelsMore;
}

function trialOrError(func) {
  try {
    func();
  }
  catch (e) {
    if (!e.userDefined)
      throw e;

    errorMessage.html(e.message);
    errorDialog.dialog({ title: "Error", autoOpen: true });
  }
}
