

$(function(){


/*    var payments = crossfilter([
        {date: "2011-11-14T16:17:54Z", quantity: 2, total: 190, tip: 100, type: "tab"},
        {date: "2011-11-14T16:20:19Z", quantity: 2, total: 190, tip: 100, type: "tab"},
        {date: "2011-11-14T16:28:54Z", quantity: 1, total: 300, tip: 200, type: "visa"},
        {date: "2011-11-14T16:30:43Z", quantity: 2, total: 90, tip: 0, type: "tab"},
        {date: "2011-11-14T16:48:46Z", quantity: 2, total: 90, tip: 0, type: "tab"},
        {date: "2011-11-14T16:53:41Z", quantity: 2, total: 90, tip: 0, type: "tab"},
        {date: "2011-11-14T16:54:06Z", quantity: 1, total: 100, tip: 0, type: "cash"},
        {date: "2011-11-14T16:58:03Z", quantity: 2, total: 90, tip: 0, type: "tab"},
        {date: "2011-11-14T17:07:21Z", quantity: 2, total: 90, tip: 0, type: "tab"},
        {date: "2011-11-14T17:22:59Z", quantity: 2, total: 90, tip: 0, type: "tab"},
        {date: "2011-11-14T17:25:45Z", quantity: 2, total: 200, tip: 0, type: "cash"},
        {date: "2011-11-14T17:29:52Z", quantity: 1, total: 200, tip: 100, type: "visa"}
    ]);
    var paymentsByTotal = payments.dimension(function(d) { return d.total; });
*/

    var size = new google.maps.Size(10.0, 10.0);
    var origin = new google.maps.Point(0, 0);
    var anchor = new google.maps.Point(6.0, 6.0);
    var reportMarker = new google.maps.MarkerImage('marker.png',
                                                   size,
                                                   origin,
                                                   anchor
                                                  );

    var markers = [];
    var myLatlng = new google.maps.LatLng(21.4776385, -157.921600);
    var myOptions = {
        zoom: 9,
        center: myLatlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(jQuery("#map")[0], myOptions);


// (It's CSV, but GitHub Pages only gzip's JSON at the moment.)
d3.csv("citysourced.csv", function(csreports) {

  // Various formatters.
  var formatNumber = d3.format(",d"),
      formatChange = d3.format("+,d"),
      formatDate = d3.time.format("%B %d, %Y"),
      formatTime = d3.time.format("%I:%M %p");
  //"6/1/2012 8:29:03 PM"
  var formatcsvDate = d3.time.format("%m/%d/%Y %I:%M:%S %p");

  // A nest operator, for grouping the flight list.
  var nestByDate = d3.nest()
      .key(function(d) { return d3.time.day(d.Date); });

  // A little coercion, since the CSV is untyped.
  csreports.forEach(function(d, i) {
    d.index = i;
    d.Date = formatcsvDate.parse(d.DateCreated);
      d.Date.setHours(d.Date.getHours()-7);
    d.RequestType = d.RequestType;
    d.StatusType = +d.StatusType;
  });
    var reportstrings = {'broken / vandalized signs': 1,
                         'abandoned vehicle (incl license number)': 2,
                         'illegal dump site': 3,
                         'other': 4,
                         'broken street lights (need pole number)': 5,
                         'stored property violation': 6,
                         'broken street lights': 7,
                         'tree or plant maintenance': 8,
                         'street light': 9,
                         'roadway danger': 10,
                         'derelict or abandoned vehicles': 11,
                         'cracked / uplifted sidewalks': 12,
                         'plants / trees overgrown': 13,
                         'abandoned vehicle (pls include license number)': 14,
                         'potholes': 15,
                         'homeless encampment': 16,
                         'sidewalk danger': 17,
                         'other (not listed please describe)': 18,
                         'pothole': 19,
                         'graffiti removal': 20,
                         'abandoned vehicle': 21,
                         'water leak (street)': 22 }


  // Create the crossfilter for the relevant dimensions and groups.
  var csreport = crossfilter(csreports),
      all = csreport.groupAll(),
      date = csreport.dimension(function(d) { return d3.time.day(d.Date); }),
      dates = date.group(),
      hour = csreport.dimension(function(d) { return d.Date.getHours() + d.Date.getMinutes() / 60; }),
      hours = hour.group(Math.floor),
    reporttype = csreport.dimension(function(d) { return (reportstrings[d.RequestType.toLowerCase()] ? reportstrings[d.RequestType.toLowerCase()] : 0); }),
    reporttypes = reporttype.group(function(d) { return d });
/*      distance = flight.dimension(function(d) { return Math.min(1999, d.distance); }),
      distances = distance.group(function(d) { return Math.floor(d / 50) * 50; });*/

  var charts = [

    barChart()
        .dimension(hour)
        .group(hours)
      .x(d3.scale.linear()
        .domain([0, 24])
        .rangeRound([0, 10 * 24])),

    barChart()
        .dimension(reporttype)
        .group(reporttypes)
      .x(d3.scale.linear()
        .domain([0, 10])
        .rangeRound([0, 10 * 10])),

/*    barChart()
        .dimension(distance)
        .group(distances)
      .x(d3.scale.linear()
        .domain([0, 2000])
        .rangeRound([0, 10 * 40])),
*/
    barChart()
        .dimension(date)
        .group(dates)
        .round(d3.time.day.round)
      .x(d3.time.scale()
        .domain([new Date(2012, 1, 1), new Date(2012, 7, 1)])
        .rangeRound([0, 5 * 180]))
        .filter([new Date(2012, 4, 1), new Date(2012, 5, 1)])

  ];

  // Given our array of charts, which we assume are in the same order as the
  // .chart elements in the DOM, bind the charts to the DOM and render them.
  // We also listen to the chart's brush events to update the display.
  var chart = d3.selectAll(".chart")
      .data(charts)
      .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });

  // Render the initial lists.
  var list = d3.selectAll(".list")
      .data([reportList]);

    var mapview = d3.selectAll("#map")
        .data([maprender]);


  // Render the total.
  d3.selectAll("#total")
      .text(formatNumber(csreport.size()));

  renderAll();

  // Renders the specified chart or list.
  function render(method) {
    d3.select(this).call(method);
  }

  // Whenever the brush moves, re-rendering everything.
  function renderAll() {
    chart.each(render);
    list.each(render);
      mapview.each(render);
    d3.select("#active").text(formatNumber(all.value()));
  }
  // Like d3.time.format, but faster.

  function parseDate(d) {
    return new Date(2001,
        d.substring(0, 2) - 1,
        d.substring(2, 4),
        d.substring(4, 6),
        d.substring(6, 8));
  }

  window.filter = function(filters) {
    filters.forEach(function(d, i) { charts[i].filter(d); });
    renderAll();
  };

  window.reset = function(i) {
    charts[i].filter(null);
    renderAll();
  };


    function maprender(div){
        var points = date.top(100);
        //add to map.
        for(m in markers){
            markers[m].setMap(null);
        }
        markers = [];


        for(p in points){
            point = points[p];
            aLatlng = new google.maps.LatLng(point.Latitude, point.Longitude);
            marker = new google.maps.Marker({
                position: aLatlng,
                map: map,
                icon:reportMarker
            });
            markers.push(marker);
        }
        

    }

  function reportList(div) {
    var reportsByDate = nestByDate.entries(date.top(50));

    div.each(function() {
      var date = d3.select(this).selectAll(".date")
          .data(reportsByDate, function(d) { return d.key; });

      date.enter().append("div")
          .attr("class", "date")
        .append("div")
          .attr("class", "day")
          .text(function(d) { return formatDate(d.values[0].Date); });

      date.exit().remove();

      var report = date.order().selectAll(".report")
          .data(function(d) { return d.values; }, function(d) { return d.index; });

      var reportEnter = report.enter().append("div")
          .attr("class", "report");

      reportEnter.append("div")
          .attr("class", "time")
          .text(function(d) { return formatTime(d.Date); });

      reportEnter.append("div")
          .attr("class", "reporttype")
          .text(function(d) { return d.RequestType; });

      reportEnter.append("div")
          .attr("class", "discription")
          .text(function(d) { return d.Description; });
/*
      reportEnter.append("div")
          .attr("class", "")
          .text(function(d) { return formatNumber(d.distance) + " mi."; });

      reportEnter.append("div")
          .attr("class", "delay")
          .classed("early", function(d) { return d.delay < 0; })
          .text(function(d) { return formatChange(d.delay) + " min."; });*/

      report.exit().remove();

      report.order();
    });
  }

  function barChart() {
    if (!barChart.id) barChart.id = 0;

    var margin = {top: 10, right: 10, bottom: 20, left: 10},
        x,
        y = d3.scale.linear().range([100, 0]),
        id = barChart.id++,
        axis = d3.svg.axis().orient("bottom"),
        brush = d3.svg.brush(),
        brushDirty,
        dimension,
        group,
        round;

    function chart(div) {
      var width = x.range()[1],
          height = y.range()[0];

      y.domain([0, group.top(1)[0].value]);

      div.each(function() {
        var div = d3.select(this),
            g = div.select("g");

        // Create the skeletal chart.
        if (g.empty()) {
          div.select(".title").append("a")
              .attr("href", "javascript:reset(" + id + ")")
              .attr("class", "reset")
              .text("reset")
              .style("display", "none");

          g = div.append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          g.append("clipPath")
              .attr("id", "clip-" + id)
            .append("rect")
              .attr("width", width)
              .attr("height", height);

          g.selectAll(".bar")
              .data(["background", "foreground"])
            .enter().append("path")
              .attr("class", function(d) { return d + " bar"; })
              .datum(group.all());

          g.selectAll(".foreground.bar")
              .attr("clip-path", "url(#clip-" + id + ")");

          g.append("g")
              .attr("class", "axis")
              .attr("transform", "translate(0," + height + ")")
              .call(axis);

          // Initialize the brush component with pretty resize handles.
          var gBrush = g.append("g").attr("class", "brush").call(brush);
          gBrush.selectAll("rect").attr("height", height);
          gBrush.selectAll(".resize").append("path").attr("d", resizePath);
        }

        // Only redraw the brush if set externally.
        if (brushDirty) {
          brushDirty = false;
          g.selectAll(".brush").call(brush);
          div.select(".title a").style("display", brush.empty() ? "none" : null);
          if (brush.empty()) {
            g.selectAll("#clip-" + id + " rect")
                .attr("x", 0)
                .attr("width", width);
          } else {
            var extent = brush.extent();
            g.selectAll("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));
          }
        }

        g.selectAll(".bar").attr("d", barPath);
      });

      function barPath(groups) {
        var path = [],
            i = -1,
            n = groups.length,
            d;
        while (++i < n) {
          d = groups[i];
          path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
        }
        return path.join("");
      }

      function resizePath(d) {
        var e = +(d == "e"),
            x = e ? 1 : -1,
            y = height / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
      }
    }

    brush.on("brushstart.chart", function() {
      var div = d3.select(this.parentNode.parentNode.parentNode);
      div.select(".title a").style("display", null);
    });

    brush.on("brush.chart", function() {
      var g = d3.select(this.parentNode),
          extent = brush.extent();
      if (round) g.select(".brush")
          .call(brush.extent(extent = extent.map(round)))
        .selectAll(".resize")
          .style("display", null);
      g.select("#clip-" + id + " rect")
          .attr("x", x(extent[0]))
          .attr("width", x(extent[1]) - x(extent[0]));
      dimension.filterRange(extent);
    });

    brush.on("brushend.chart", function() {
      if (brush.empty()) {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", "none");
        div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
        dimension.filterAll();
      }
    });

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      axis.scale(x);
      brush.x(x);
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return chart;
    };

    chart.dimension = function(_) {
      if (!arguments.length) return dimension;
      dimension = _;
      return chart;
    };

    chart.filter = function(_) {
      if (_) {
        brush.extent(_);
        dimension.filterRange(_);
      } else {
        brush.clear();
        dimension.filterAll();
      }
      brushDirty = true;
      return chart;
    };

    chart.group = function(_) {
      if (!arguments.length) return group;
      group = _;
      return chart;
    };

    chart.round = function(_) {
      if (!arguments.length) return round;
      round = _;
      return chart;
    };

    return d3.rebind(chart, brush, "on");
  }
});


});

