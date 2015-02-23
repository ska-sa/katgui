angular.module('katGui.d3')

    .directive('receptorStatusPartitionMap', function (d3Service, StatusService, $timeout, $rootScope, d3Util) {
        return {
            restrict: 'E',
            scope: {
                dataMapName: '=receptor',
                chartSize: '='
            },
            link: function (scope, element) {

                d3Service.d3().then(function (d3) {

                    var data = StatusService.statusData[scope.dataMapName];
                    var r = 640, node, root, transitionDuration = 250;
                    var margin = {top: 8, right: 8, left: 8, bottom: 8};
                    var tooltip = d3Util.createTooltip(element[0]);

                    d3Util.waitUntilDataExists(data)
                        .then(function () {
                            drawPartitionMap();
                        }, function () {
                            d3Util.displayInitErrorMessage(scope.dataMapName);
                        });

                    function drawPartitionMap() {
                        var width = scope.chartSize.width;
                        var height = scope.chartSize.height;
                        node = root = data;

                        r = height - 10;
                        var x = d3.scale.linear().range([0, width]);
                        var y = d3.scale.linear().range([0, height]);

                        var mapLayout = d3.layout.partition()
                            .value(function (d) {
                                return d.blockValue;
                            })
                            .sort(function (a, b) {
                                return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
                            });

                        var svg = d3.select(element[0]).append("svg")
                            .attr("width", width)
                            .attr("height", height)
                            .attr("class", "health-chart md-whiteframe-z2 treemapHealthChart" + scope.dataMapName)
                            .style("margin-left", margin.left + "px")
                            .style("margin-right", margin.right + "px")
                            .style("margin-top", margin.top + "px")
                            .style("margin-bottom", margin.bottom + "px")
                            .append("g");

                        var g = svg.selectAll("g")
                            .data(mapLayout.nodes(root))
                            .enter().append("svg:g")
                            .attr("transform", function (d) {
                                return "translate(" + x(d.y) + "," + y(d.x) + ")";
                            })
                            .attr("id", d3Util.createSensorId)
                            .on("click", click);

                        var kx = (width) / root.dx,
                            ky = height / 1;

                        g.append("svg:rect")
                            .attr("width", function (d) {
                                return root.dy * kx;
                            })
                            .attr("height", function (d) {
                                return d.dx * ky;
                            })
                            .attr("class", function (d) {
                                return d.children ? "part-parent" : "child";
                            })
                            .call(function (d) {
                                d3Util.applyTooltip(d, tooltip, scope.dataMapName);
                            });

                        g.append("svg:text")
                            .attr("transform", transform)
                            .attr("dy", ".35em")
                            .style("opacity", function (d) {
                                return d.dx * ky > 12 ? 1 : 0;
                            })
                            .attr("class", function (d) {
                                if (d.objValue) {
                                    return d3Util.statusClassFromNumber(d.objValue.status) + '-child-text child';
                                } else if (d.sensorValue) {
                                    return d3Util.statusClassFromNumber(d.sensorValue.status) + '-child-text parent';
                                }
                            })
                            .text(function (d) {
                                return d3Util.trimmedName(d, scope.dataMapName);
                            });

                        g.attr("class", function (d) {
                            if (d.objValue) {
                                return d3Util.statusClassFromNumber(d.objValue.status) + '-child child';
                            } else if (d.sensorValue) {
                                return d3Util.statusClassFromNumber(d.sensorValue.status) + '-child child';
                            }
                        });

                        function click(d) {

                            kx = (d.y ? width - 40 : width) / (1 - d.y);
                            ky = height / d.dx;
                            x.domain([d.y, 1]).range([d.y ? 40 : 0, width]);
                            y.domain([d.x, d.x + d.dx]);

                            var t = g.transition()
                                .duration(transitionDuration)
                                .attr("transform", function (d) {
                                    return "translate(" + x(d.y) + "," + y(d.x) + ")";
                                });

                            t.select("rect")
                                .attr("width", d.dy * kx)
                                .attr("height", function (d) {
                                    return d.dx * ky;
                                })
                                .call(function (d) {
                                    d3Util.applyTooltip(d, tooltip, scope.dataMapName);
                                });

                            t.select("text")
                                .attr("transform", transform)
                                .style("opacity", function (d) {
                                    return d.dx * ky > 12 ? 1 : 0;
                                });

                            d3.event.stopPropagation();
                        }

                        function transform(d) {
                            return "translate(8," + d.dx * ky / 2 + ")";
                        }
                    }
                });
            }
        };
    });


