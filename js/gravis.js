define(["d3"], (d3) => {

  // a valid entity in the graph must not be null and must have an id.
  function is_valid_entity(x) {
    return (x && x.hasOwnProperty("id"));
  }

  function is_node(x) {
    return is_valid_entity(x) && !(x.hasOwnProperty("source") || x.hasOwnProperty("target"));
  }

  function is_relationship(x) {
    return is_valid_entity(x) && is_node(x.source) && is_node(x.target);
  }

  class Graph {
    constructor() {
      this._nodes = {};
      this._links = {};
    }

    add(x) {
      if (is_node(x)) {
        this._nodes[x.id] = x;
      }
      else if (is_relationship(x)) {
        this.add(x.source);
        this.add(x.target);
        this._links[x.id] = x;
      }
    }

    remove(x) {
      if (is_node(x)) {
        delete this._nodes[x.id];
      }
      else if (is_relationship(x)) {
        delete this._links[x.id];
      }
    }
  };

  function get_id(x) {
    return x.id;
  }

  class Vis {
    constructor(graph, width, height) {
      this._graph = graph;
      this._width = width;
      this._height = height;
      this._sim = d3.forceSimulation()
        .velocityDecay(0.1)
        .force("charge", d3.forceManyBody().strength(-3))
        .force("link", d3.forceLink().distance(50).strength(1))
        .force("center", d3.forceCenter(this._width/2, this._height/2))
        .on("tick", this.tick.bind(this));
      this._events = ["click", "dblclick", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseover", "mouseout", "mouseup"];
      this.dispatch = d3.dispatch(...this._events);
      this._init();
    }

    _init() {
      // create svg
      this._svg = d3.select("#force").append("svg")
        .attr("id", "forcesvg")
        .attr("preserveAspectRatio", "none")
        .attr("viewBox", `0 0 ${this._width} ${this._height}`)
        .classed("svg-content", true)
        .style("cursor", "crosshair");

      this._make_interactive(this._svg);

      // create groups in the svg for links and nodes
      // do links first so links will be drawn underneath nodes.
      this._links = this._svg.append("g").selectAll(".link");
      this._nodes = this._svg.append("g").selectAll(".node");
    }

    update() {
      this._update_entities();
      this.restart_simulation();
    }

    _update_entities() {
      this._nodes = this._update_selection(this._nodes, Object.values(this._graph._nodes), this._process_node_enter);
      this._links = this._update_selection(this._links, Object.values(this._graph._links), this._process_link_enter);
    }

    _update_selection(s, x, onEnter) {
      s = s.data(x, get_id);
      s.exit().remove();
      s = onEnter(s.enter()).merge(s);
      this._make_interactive(s);
      return s;
    }

    _process_node_enter(s) {
      let group = s.append("g").attr("class", "node");
      group.append("circle").attr("r", 5);
      return group;
    }

    _process_link_enter(s) {
      let group = s.append("g").attr("class","link");
      group.append("line");
      return group;
    }

    _make_interactive(s) {
      let dispatch = this.dispatch;
      this._events.map((event) => {
        s.on(event, function (d) {console.log(event); d3.event.stopPropagation(); dispatch.call(event, this, d)} );
      });
    }

    restart_simulation() {
      this._sim.nodes(Object.values(this._graph._nodes));
      this._sim.force("link").links(Object.values(this._graph._links));
      this._sim.alpha(1).restart();
    }

    tick() {
      // update the positions of the nodes in the svg based on their coordinates
      // as computed by the force layout.
      let bound = (x, limit, pad) => {
        x = (x < pad) ? pad : x;
        x = (x > (limit-pad)) ? limit-pad : x;
        return x;
      };

      let pad = 10
      this._nodes.attr("transform", function (d) {
        d.x = bound(d.x, this._width, pad);
        d.y = bound(d.y, this._height, pad);
        return "translate(" + d.x + "," + d.y + ")";
      }.bind(this));

      // update the endpoints of the lines based on their source and end node
      // locations.
      this._links.selectAll("line")
        .attr("x1", function(d) { return this._graph._nodes[d.source.id].x; }.bind(this))
        .attr("y1", function(d) { return this._graph._nodes[d.source.id].y; }.bind(this))
        .attr("x2", function(d) { return this._graph._nodes[d.target.id].x; }.bind(this))
        .attr("y2", function(d) { return this._graph._nodes[d.target.id].y; }.bind(this));
    }
  }

  class Interact {
    constructor(vis) {
      this._vis = vis;
      this.events = ["select", "deselect", "create"];
      this.dispatch = d3.dispatch(...this.events);
      this.selected = null;
      this._vis.dispatch.on("click.gesture", this._click_closure());
    }

    _click_closure() {
      let self = this;
      return function (d) {
        if (d3.event.shiftKey) {
          console.log("shift click!");
          self.dispatch.call("create", this, d);
        }
        else if (is_valid_entity(d)) {
          self.dispatch.call("select", this, d);
        }
        else {
          self.dispatch.call("deselect");
        }
      };
    }

  }

  // from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  }

  function colorize(element) {
    if (!element) return;
    let s = d3.select(element);
    let d = s.data()[0];
    let color = choose_color(JSON.parse(s.attr("status")));
    if (is_node(d)) {
      s.style("fill", color);
    }
    else if (is_relationship(d)) {
      s.selectAll("line").style("stroke", color);
    }
  }

  function choose_color(status) {
    if (!status) {
      return null;
    }
    else if ("select" in status) {
      return "lime";
    }
    else if ("hover" in status) {
      return "yellow";
    }
  }

  function add_status(element, code, add=true) {
    if (!element) return;
    let s = d3.select(element);
    let status = JSON.parse(s.attr("status"));
    if (!status) status = {};
    if (add) {
      status[code] = true;
    }
    else {
      delete status[code];
      if (Object.keys(status).length === 0) {
        s.attr("status", null);
        return;
      }
    }
    s.attr("status",JSON.stringify(status));
  }

  function find_selected(svg) {
    let selected = null;
    d3.selectAll("[status]").each( function (d) {
      if ("select" in JSON.parse(d3.select(this).attr("status"))) {
        selected = this;
      }
    });
    return selected;
  }

  class Actions {
    constructor(int) {
      this._int = int;
    }

    highlight_selected_entity() {
      let dispatch = this._int.dispatch;
      let name = "highlight_selected_node";
      let selected = null;

      dispatch.on(`select.${name}`, function (d) {
        dispatch.call("deselect");
        add_status(this, "select")
        colorize(this)
        selected = this;
      });

      dispatch.on(`deselect.${name}`, function () {
        add_status(selected, "select", null)
        colorize(selected);
        selected = null;
      });
    }

    highlight_hover_entity() {
      let dispatch = this._int._vis.dispatch;
      let name = "highlight_hover_entity";
      let hovered = null;

      dispatch.on(`mouseenter.${name}`, function (d) {
        dispatch.call("mouseleave");
        if (is_valid_entity(d)) {
          add_status(this, "hover")
        }
        colorize(this);
        hovered = this;
      });

      dispatch.on(`mouseleave.${name}`, function (d) {
        add_status(this, "hover", null)
        colorize(this);
        hovered = null;
      });
    }

    create_node_on_shift_click() {
      let self = this;
      let dispatch = this._int.dispatch;
      let name = "create_node_on_shift_click";
      let vis = this._int._vis;

      dispatch.on(`create.${name}`, function (d) {
        let c = d3.mouse(this);
        let x = null;
        let sd = d3.select(find_selected()).data()[0];

        if (!sd) {
          console.log("create floating", d);
          x = {id: uuidv4(), x: c[0], y: c[1]}
        }
        else {
          if (is_node(d) && d !== sd) {
            console.log("create link");
            x = {id: uuidv4(), source: sd, target: d};
          }
          else {
            console.log("create linked node");
            x = {id: uuidv4(), source: sd, target: {id: uuidv4(), x: c[0], y: c[1]}};
          }
        }
        vis._graph.add(x);
        vis.update();
      });
    }
    // create node
    // delete node
    // create relationship
    // delete relationship
  }

  return {
    "Graph": Graph,
    "Vis": Vis,
    "Interact": Interact,
    "Actions": Actions,
  };

});
