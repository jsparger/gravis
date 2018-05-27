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
        // .force("center", d3.forceCenter(this._width/2, this._height/2))
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
        .classed("svg-content", true);

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
        x = (x > limit-pad) ? limit-pad : x;
        return x;
      };

      let pad = 10
      this._nodes.attr("transform", function (d) {
        d.x = bound(d.x, this._width, pad);
        d.y = bound(d.y, this._height, pad);
        return "translate(" + d.x + "," + d.y + ")";
      });

      // update the endpoints of the lines based on their source and end node
      // locations.
      this._links.selectAll("line")
        .attr("x1", function(d) { return this._graph._nodes[d.source.id].x; }.bind(this))
        .attr("y1", function(d) { return this._graph._nodes[d.source.id].y; }.bind(this))
        .attr("x2", function(d) { return this._graph._nodes[d.target.id].x; }.bind(this))
        .attr("y2", function(d) { return this._graph._nodes[d.target.id].y; }.bind(this));
    }
  }

  class Gestures {
    // create node
    // delete node
    // create relationship
    // delete relationship
  }

  return {
    "Graph": Graph,
    "Vis": Vis,
  };

});
