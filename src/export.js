import $ from "jquery";
import FileSaver from "file-saver";
import H from "./util/helper";

function toLatex(ppc, qv, config) {
  return [
    "\\documentclass[tikz]{standalone}",
    "\\usepackage{tikz}",
    "\\usetikzlibrary{arrows.meta}",
    "\\begin{document}",
    moduleQuiverToLatex(ppc, qv, config),
    "\\end{document}"
  ]
    .join("\n");
}

function moduleQuiverToLatex(ppc, qv, config) {
  return quiverViewToLatex(
    qv,
    $.extend(
      {
        dy: ppc.dy,
        vName: v => dimVectorToLatex(v.dimVector),
        aName: a => a.toString()
      },
      config
    )
  );
}

function quiverViewToLatex(qv, config) {
  const { y_min, h } = qv.boundingBox(),
    scaleX = Math.max(h / 20000, 0.035),
    tikzOpts = config.verticallyOriented
      ? `x=0.025cm,y=-${scaleX.toFixed(3)}cm,rotate=-90`
      : `x=${scaleX.toFixed(3)}cm,y=-0.025cm`;

  return [
    ` \\begin{tikzpicture}[${tikzOpts}]`,
    `  \\clip (0,${Math.ceil(y_min - config.dy / 2)}) rectangle + (${qv.w},${h + config.dy});`,
    verticesToLatex(qv.quiver, config),
    arrowsToLatex(qv.quiver, config),
    " \\end{tikzpicture}"
  ]
    .join("\n");
}

function verticesToLatex(quiver, config) {
  const res = [];

  res.push("  \\begin{scope}[every node/.style={inner sep=4pt,font=\\footnotesize}]");

  for (const v of quiver.vertices) {
    const n = config.vName ? `$${config.vName(v)}$` : "";

    res.push(`   \\node (${vName(v)}) at (${v.x},${v.y}) {${n}};`);
  }

  res.push("  \\end{scope}");

  return res.join("\n");
}

function arrowsToLatex(quiver, config) {
  const res = [],
    scopeOpts = [
      "every node/.style={fill=white,font=\\scriptsize}",
      "every path/.style={-{Latex[length=1.5mm,width=1mm]}}"
    ];

  res.push(`  \\begin{scope}[${scopeOpts.join(",")}]`);

  for (const a of quiver.arrows) {
    const n = H.withDefault(config.aName ? config.aName(a) : null, "", x => ` node {$${x}$}`),
      o = a.trans ? "[dashed]" : "";

    res.push(`   \\path (${vName(a.source)}) edge${o}${n} (${vName(a.target)});`);
  }

  res.push("  \\end{scope}");

  return res.join("\n");
}

function dimVectorToLatex(d) {
  return `${Object.entries(d).filter(x => x[1] > 0).map(x =>
    x[0] + (x[1] > 1 ? `^{${String(x[1])}}` : "")
  ).join(" ")}`;
}

function vName(v) {
  return `${v.index}_${v.r}`;
}

function exportToLatex(ppc, qv, config) {
  const fileName = config.name ? config.name : "knitting.tex";

  FileSaver.saveAs(
    new Blob([toLatex(ppc, qv, config)], { type: "text/x-tex;charset=utf-8" }), fileName
  );
}

function exportToPDF(ppc, qv, config) {
  const form = document.createElement("form"),
    jForm = $(form),
    inputs = [
      { name: "spw", value: "2" },
      { name: "finit", value: "nothing" },
      { name: "aformat", value: "PDF" },
      { name: "compile", value: "Compile" }
    ],
    textareas = [
      { name: "quellcode", value: toLatex(ppc, qv, config) }
    ];

  for (const x of inputs)
    form.appendChild($.extend(document.createElement("input"), x));
  for (const x of textareas)
    form.appendChild($.extend(document.createElement("textarea"), x));

  $.extend(form, {
    action: "https://latex.informatik.uni-halle.de/latex-online/latex.php",
    method: "post",
    target: "_blank",
    style: "display: none"
  });

  $("body").append(jForm);
  form.submit();
  jForm.remove();
}

export default {
  exportToLatex,
  exportToPDF
};
