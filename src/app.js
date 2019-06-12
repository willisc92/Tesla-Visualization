import * as d3 from "d3";
import * as topojson from "topojson";

(async function() {
    // Loading external data
    const width = 960;
    const height = 500;

    const config = {
        speed: 0.005,
        verticalTilt: -30,
        horizontalTilt: 0
    };

    let locations = [];
    let gdistance;

    d3.json("/data/TESLA_CLEAN_TWEETS_SINGLE_OBJ.json").then(function(location_data) {
        locations = location_data;
    });

    const svg = d3
        .select("svg")
        .attr("width", width)
        .attr("height", height);

    const markerGroup = svg.append("g");

    const projection = d3.geoOrthographic();
    const initialScale = projection.scale();

    const path = d3.geoPath().projection(projection);
    const center = [width / 2, height / 2];

    drawGlobe();
    drawGraticule();
    enableRotation();
    drawMarkers();

    function drawGlobe() {
        d3.json("data/world-110m.json").then(function(worldData) {
            svg.selectAll(".segment")
                .data(topojson.feature(worldData, worldData.objects.countries).features)
                .enter()
                .append("path")
                .attr("class", "segment")
                .attr("d", path)
                .style("stroke", "#888")
                .style("stroke-width", "1px")
                .style("fill", (d, i) => "#F2D7D5")
                .style("fill-opacity", 0.3);
        });
    }

    function drawGraticule() {
        const graticule = d3.geoGraticule().step([10, 10]);
        svg.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path)
            .style("fill", "#fff")
            .style("stroke", "#ccc");
    }

    function enableRotation() {
        d3.timer(function(elapsed) {
            projection.rotate([config.speed * elapsed - 120, config.verticalTilt, config.horizontalTilt]);
            svg.selectAll("path").attr("d", path);
            drawMarkers();
        });
    }

    function drawMarkers() {
        const markers = markerGroup.selectAll("circle").data(locations);
        markers
            .enter()
            .append("circle")
            .merge(markers)
            .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
            .attr("cy", (d) => projection([d.longitude, d.latitude])[1])
            .attr("fill", (d) => {
                const sentiment = d.sentiment;
                const coordinate = [d.longitude, d.latitude];
                gdistance = d3.geoDistance(coordinate, projection.invert(center));
                return gdistance > 1.57 ? "none" : sentiment > 0 ? "steelblue" : "red";
            })
            .attr("r", 2)
            .transition()
            .duration(400)
            .attr("r", 3);

        markers
            .exit()
            .transition()
            .duration(200)
            .attr("r", 1)
            .remove();

        markerGroup.each(function() {
            this.parentNode.appendChild(this);
        });
    }
})();
