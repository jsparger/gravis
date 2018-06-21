let a = {id: 0, name: "A"};
let b = {id: 1, name: "B"};
let c = {id: 2, name: "C"};
let d = {id: 3, name: "D"};
let r = {id: 0, source: a, target: b, name: "r"};
let r2 = {id:1, source: a, target: c, name: "r2"};

let w = 500; let h = 250;
let graph = new gravis.Graph();
let vis = new gravis.Vis(graph, w, h);
vis.dispatch.on("click.visualize", function (d) {console.log("Got click event in visualization.html", this, d);});
let int = new gravis.Interact(vis);
int.dispatch.on("select.visualize", function (d) {console.log("Got select event in visualization.html", this, d);});
int.dispatch.on("deselect.visualize", function (d) {console.log("Got deselect event in visualization.html", this, d);});
let act = new gravis.Actions(int);
act.highlight_selected_entity();
act.highlight_hover_entity();
act.create_node_on_shift_click();
act.delete_selected_node();


graph.add(r);
vis.update();

setTimeout(() => {
  graph.add(r2);
  graph.add(d);
  vis.update();
}, 1000);

setTimeout(() => {
  graph.remove(r2);
  graph.remove(d);
  vis.update();
}, 2000);

setTimeout(() => {
  graph.add(r2);
  graph.add(d);
  graph.add({id: 2, source: d, target: c})
  vis.update();
}, 3000);
