import * as d3 from "d3";
import * as topojson from "topojson";
import * as slider from "d3-simple-slider";
import * as timeformat from "d3-time-format";
import numeral from "numeral";

(async function() {
    const minTime = 1545536869108;
    const maxTime = 1549220493963;
    const minDate = new Date(minTime);
    const maxDate = new Date(maxTime);
    let filter_minTime = minTime;
    let filter_maxTime = maxTime;

    const width = 960;
    const height = 500;

    const config = {
        speed: 0.005,
        verticalTilt: -30,
        horizontalTilt: 0
    };

    let locations = [];
    var averagePrice;
    let priceData = [];
    let gdistance;

    // Range
    var sliderRange = slider
        .sliderBottom()
        .min(minDate)
        .max(maxDate)
        .width(500)
        .tickFormat(timeformat.timeFormat("%x"))
        .ticks(5)
        .default([minDate, maxDate])
        .fill("#2196f3")
        .on("onchange", (val) => {
            filter_minTime = val[0];
            filter_maxTime = val[1];
            d3.select("p#value-range").text(val.map(timeformat.timeFormat("%x")).join("-"));
            drawMarkers();
            getAverageStockPrice();
            getMajoritySentiment();
            getRandomTweet();
        });

    var gRange = d3
        .select("div#slider-range")
        .append("svg")
        .attr("width", 600)
        .attr("height", 100)
        .append("g")
        .attr("transform", "translate(30,30)");

    gRange.call(sliderRange);

    d3.select("p#value-range").text(
        sliderRange
            .value()
            .map(timeformat.timeFormat("%x"))
            .join("-")
    );

    // IMPORT EXTERNAL DATA
    d3.json("/data/TESLA_CLEAN_TWEETS_SINGLE_OBJ.json").then(function(location_data) {
        locations = location_data;
        getMajoritySentiment();

        console.log(locations);
        getRandomTweet();
    });

    d3.csv("/data/TSLA.csv").then(function(stock_data) {
        priceData = stock_data.map(function(row) {
            let rowDate = new Date(row.Date);
            return {
                price: parseFloat(row.Close),
                date: rowDate
            };
        });
        console.log(priceData);
        getAverageStockPrice();
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

    function getAverageStockPrice() {
        let rowsInDateRange = [];

        priceData.forEach(function(row) {
            if (row.date >= new Date(filter_minTime) && row.date <= new Date(filter_maxTime)) {
                return rowsInDateRange.push(row);
            }
        });

        let total = 0;
        let counter = 0;
        if (rowsInDateRange.length === 0) {
            return;
        }

        rowsInDateRange.forEach(function(row) {
            total += row.price;
            counter += 1;
        });

        averagePrice = total / counter;

        d3.select("h3#avg-stock-price").text(
            "Average Stock Price: ".concat(
                numeral(averagePrice)
                    .format("$0,0.00")
                    .toString()
            )
        );
    }

    function getRandomTweet() {
        let randomtweets = [];
        let oddcount = 0;
        let evencount = 0;
        locations.forEach(function(row) {
            if (row.timestamp >= filter_minTime && row.timestamp <= filter_maxTime && row.sentiment === 1) {
                return randomtweets.push(row.text);
            } else if (row.timestamp >= filter_minTime && row.timestamp <= filter_maxTime && row.sentiment === -1) {
                return randomtweets.push(row.text);
            }
        });

        var filtered = randomtweets.slice(0, 10);

        d3.selectAll("li").remove();

        d3.select("ul#items")
            .data(filtered)
            .enter()
            .append("li")
            .text(function(i) {
                return i;
            });
    }

    function sentimentCheck(positive, negative) {
        if (positive > negative) {
            if (positive > 2 * negative) {
                return "Strongly Positive";
            } else {
                return "Positive";
            }
        } else if (positive === negative) {
            return "Neutral";
        } else {
            if (negative > 2 * positive) {
                return "Strongly Negative";
            } else {
                return "Negative";
            }
        }
    }

    function getMajoritySentiment() {
        let positive = 0;
        let negative = 0;
        locations.forEach(function(row) {
            if (row.timestamp >= filter_minTime && row.timestamp <= filter_maxTime) {
                if (row.sentiment > 0) {
                    positive += 1;
                }
                if (row.sentiment < 0) {
                    negative += 1;
                }
            }
        });

        let sentiment = "";
        sentiment = sentimentCheck(positive, negative);
        d3.select("h3#majority-sentiment").text("Overall Sentiment: ".concat(sentiment).toString());
    }

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
                const timestamp = d.timestamp;
                const sentiment = d.sentiment;
                const coordinate = [d.longitude, d.latitude];
                gdistance = d3.geoDistance(coordinate, projection.invert(center));
                return gdistance > 1.57 || timestamp < filter_minTime || timestamp > filter_maxTime
                    ? "none"
                    : sentiment > 0
                    ? "steelblue"
                    : "red";
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
