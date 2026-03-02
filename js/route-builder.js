/*
  Route Builder - Smart intercity travel routes using photo geotags.
  Replaces straight city-to-city lines with geographically accurate paths
  derived from photo GPS coordinates, simplified to avoid visual clutter.
*/
var buildSmartRoutes = (function () {

    // Tunable constants
    var CLUSTER_RADIUS_KM = 15;
    var CLUSTER_TIME_GAP_HRS = 4;
    var RDP_EPSILON = 0.01;       // ~1km in degrees
    var MAX_WAYPOINTS = 15;

    /**
     * Compass bearing from point A to point B (degrees 0-360).
     */
    function calcBearing(lat1, lng1, lat2, lng2) {
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var lat1r = lat1 * Math.PI / 180;
        var lat2r = lat2 * Math.PI / 180;
        var y = Math.sin(dLng) * Math.cos(lat2r);
        var x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLng);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    /**
     * Chronological sweep clustering.
     * Merges sequential photos within radiusKm / timeGapHrs into clusters.
     * Returns array of {lat, lng, datetime, count} centroids.
     */
    function chronoCluster(sortedPhotos, radiusKm, timeGapHrs) {
        if (!sortedPhotos || sortedPhotos.length === 0) return [];

        var clusters = [[sortedPhotos[0]]];

        for (var i = 1; i < sortedPhotos.length; i++) {
            var prev = clusters[clusters.length - 1];
            var last = prev[prev.length - 1];
            var curr = sortedPhotos[i];

            var distM = L.latLng(last.lat, last.lng).distanceTo(L.latLng(curr.lat, curr.lng));
            var hoursDiff = (new Date(curr.datetime) - new Date(last.datetime)) / 3600000;

            if (distM / 1000 <= radiusKm && hoursDiff <= timeGapHrs) {
                prev.push(curr);
            } else {
                clusters.push([curr]);
            }
        }

        return clusters.map(function (group) {
            var sumLat = 0, sumLng = 0;
            for (var j = 0; j < group.length; j++) {
                sumLat += group[j].lat;
                sumLng += group[j].lng;
            }
            return {
                lat: sumLat / group.length,
                lng: sumLng / group.length,
                datetime: group[0].datetime,
                count: group.length
            };
        });
    }

    /**
     * Perpendicular distance from point P to the line between A and B.
     * Uses degree-space approximation (sufficient for European latitudes).
     */
    function perpendicularDist(p, a, b) {
        var dx = b.lng - a.lng;
        var dy = b.lat - a.lat;
        var lenSq = dx * dx + dy * dy;
        if (lenSq === 0) {
            var ddx = p.lng - a.lng;
            var ddy = p.lat - a.lat;
            return Math.sqrt(ddx * ddx + ddy * ddy);
        }
        var t = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        var projLng = a.lng + t * dx;
        var projLat = a.lat + t * dy;
        var ex = p.lng - projLng;
        var ey = p.lat - projLat;
        return Math.sqrt(ex * ex + ey * ey);
    }

    /**
     * Ramer-Douglas-Peucker polyline simplification.
     * Input/output: array of {lat, lng} objects. Epsilon in degrees.
     */
    function rdpSimplify(waypoints, epsilon) {
        if (waypoints.length <= 2) return waypoints;

        var dmax = 0, index = 0;
        var start = waypoints[0];
        var end = waypoints[waypoints.length - 1];

        for (var i = 1; i < waypoints.length - 1; i++) {
            var d = perpendicularDist(waypoints[i], start, end);
            if (d > dmax) {
                dmax = d;
                index = i;
            }
        }

        if (dmax > epsilon) {
            var left = rdpSimplify(waypoints.slice(0, index + 1), epsilon);
            var right = rdpSimplify(waypoints.slice(index), epsilon);
            return left.slice(0, -1).concat(right);
        }
        return [start, end];
    }

    /**
     * Extract photos relevant to the route between two adjacent segments.
     * Includes transit photos (between segment times), outlier photos
     * from segFrom (far from origin city), and early outlier photos from
     * segTo (far from destination city, chronologically in first half of segment).
     * usedPhotos set prevents the same photo from appearing on multiple routes.
     */
    function getRoutePhotos(allPhotos, segFrom, segTo, usedPhotos) {
        var fromEnd = new Date(segFrom.end);
        var toStart = new Date(segTo.start);
        var fromCenter = L.latLng(segFrom.lat, segFrom.lng);
        var toCenter = L.latLng(segTo.lat, segTo.lng);
        var radiusM = CLUSTER_RADIUS_KM * 1000;

        // For segTo outlier detection: only consider photos in the first half
        // of the destination segment (likely still in transit, not settled)
        var toEnd = new Date(segTo.end);
        var toMidpoint = new Date(toStart.getTime() + (toEnd.getTime() - toStart.getTime()) / 2);

        var result = [];
        var seen = {};

        for (var i = 0; i < allPhotos.length; i++) {
            var p = allPhotos[i];
            if (p.lat == null || p.lng == null || !p.datetime) continue;

            var key = p.url || (p.lat + ',' + p.lng + ',' + p.datetime);
            if (seen[key] || (usedPhotos && usedPhotos[key])) continue;

            var pTime = new Date(p.datetime);

            // Transit photos: between segment boundaries
            if (pTime >= fromEnd && pTime <= toStart) {
                seen[key] = true;
                result.push(p);
                continue;
            }

            // Outlier photos: assigned to segFrom but far from origin city center
            if (p.cityName === segFrom.name) {
                var distFrom = fromCenter.distanceTo(L.latLng(p.lat, p.lng));
                if (distFrom > radiusM) {
                    seen[key] = true;
                    result.push(p);
                    continue;
                }
            }

            // Destination outlier photos: assigned to segTo, far from destination
            // city center, and in the first half of the destination segment.
            // These are likely transit photos misassigned due to overlapping timestamps.
            if (p.cityName === segTo.name && pTime <= toMidpoint) {
                var distTo = toCenter.distanceTo(L.latLng(p.lat, p.lng));
                if (distTo > radiusM) {
                    seen[key] = true;
                    result.push(p);
                }
            }
        }

        result.sort(function (a, b) {
            return a.datetime < b.datetime ? -1 : a.datetime > b.datetime ? 1 : 0;
        });

        return result;
    }

    /**
     * Build waypoint sequence for a route: origin → clusters → destination.
     * Applies clustering, prepend/append city centroids, then RDP + cap.
     */
    function computeWaypoints(routePhotos, segFrom, segTo) {
        var origin = { lat: segFrom.lat, lng: segFrom.lng };
        var dest = { lat: segTo.lat, lng: segTo.lng };

        if (!routePhotos || routePhotos.length === 0) {
            return [origin, dest];
        }

        var clusters = chronoCluster(routePhotos, CLUSTER_RADIUS_KM, CLUSTER_TIME_GAP_HRS);
        var waypoints = [origin];
        for (var i = 0; i < clusters.length; i++) {
            waypoints.push({ lat: clusters[i].lat, lng: clusters[i].lng });
        }
        waypoints.push(dest);

        // Simplify if too many waypoints
        var eps = RDP_EPSILON;
        while (waypoints.length > MAX_WAYPOINTS) {
            waypoints = rdpSimplify(waypoints, eps);
            eps *= 1.5;
        }

        return waypoints;
    }

    /**
     * Render a single route as dual-layer polyline + arrow marker.
     */
    function renderRoute(waypoints, segFrom, segTo, routeGroup, arrowMarkers) {
        var coords = [];
        for (var i = 0; i < waypoints.length; i++) {
            coords.push([waypoints[i].lat, waypoints[i].lng]);
        }

        // Background: solid, thick, subtle
        var bgLine = L.polyline(coords, {
            color: segFrom.color,
            weight: 5,
            opacity: 0.3,
            lineCap: 'round'
        });
        bgLine.bindPopup(segFrom.name + ' \u2192 ' + segTo.name);
        routeGroup.addLayer(bgLine);

        // Foreground: dashed, animated flow
        var fgLine = L.polyline(coords, {
            color: segFrom.color,
            weight: 3,
            opacity: 0.7,
            dashArray: '8, 12',
            className: 'route-line-animated'
        });
        routeGroup.addLayer(fgLine);

        // Arrow at route midpoint
        var midIdx = Math.floor(waypoints.length / 2);
        var midLat = waypoints[midIdx].lat;
        var midLng = waypoints[midIdx].lng;
        var bearing = calcBearing(segFrom.lat, segFrom.lng, segTo.lat, segTo.lng);
        var arrowIcon = L.divIcon({
            className: 'route-arrow-icon',
            html: '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1 L14 13 L8 9 L2 13 Z" fill="' + segFrom.color + '" opacity="0.85" transform="rotate(' + bearing + ', 8, 8)"/></svg>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        var arrowMk = L.marker([midLat, midLng], { icon: arrowIcon, interactive: false });
        arrowMarkers.push(arrowMk);
        routeGroup.addLayer(arrowMk);
    }

    /**
     * Main entry point. Computes smart routes and returns L.layerGroup.
     * @param {Array} photos   - Full photo manifest array
     * @param {Array} segments - Trip segments array (from trip_segments.json)
     * @param {L.Map} map      - Leaflet map instance
     * @returns {L.LayerGroup}
     */
    function buildRoutes(photos, segments, map) {
        if (!segments || segments.length < 2) {
            return L.layerGroup();
        }

        var routeGroup = L.layerGroup();
        var arrowMarkers = [];
        var routeStats = [];
        var usedPhotos = {};  // dedup: photos used by one route are excluded from later routes

        for (var ri = 0; ri < segments.length - 1; ri++) {
            var segFrom = segments[ri];
            var segTo = segments[ri + 1];

            var routePhotos = getRoutePhotos(photos, segFrom, segTo, usedPhotos);

            // Mark these photos as used so subsequent routes don't double-count
            for (var ui = 0; ui < routePhotos.length; ui++) {
                var up = routePhotos[ui];
                var uKey = up.url || (up.lat + ',' + up.lng + ',' + up.datetime);
                usedPhotos[uKey] = true;
            }
            var waypoints = computeWaypoints(routePhotos, segFrom, segTo);

            // Gap remediation: check for >200km segments with available intermediates
            if (waypoints.length >= 2) {
                var preRdpWaypoints = null; // will store pre-simplified if needed
                // Recompute pre-RDP waypoints for gap check
                if (routePhotos.length > 0) {
                    var clusters = chronoCluster(routePhotos, CLUSTER_RADIUS_KM, CLUSTER_TIME_GAP_HRS);
                    preRdpWaypoints = [{ lat: segFrom.lat, lng: segFrom.lng }];
                    for (var ci = 0; ci < clusters.length; ci++) {
                        preRdpWaypoints.push({ lat: clusters[ci].lat, lng: clusters[ci].lng });
                    }
                    preRdpWaypoints.push({ lat: segTo.lat, lng: segTo.lng });
                }

                var changed = true;
                while (changed) {
                    changed = false;
                    for (var gi = 0; gi < waypoints.length - 1; gi++) {
                        var gapM = L.latLng(waypoints[gi].lat, waypoints[gi].lng)
                            .distanceTo(L.latLng(waypoints[gi + 1].lat, waypoints[gi + 1].lng));
                        var gapKm = gapM / 1000;

                        if (gapKm > 200 && preRdpWaypoints && preRdpWaypoints.length > 2) {
                            // Find the most significant dropped point in this gap
                            var bestDist = 0, bestPt = null;
                            for (var pi = 0; pi < preRdpWaypoints.length; pi++) {
                                var pt = preRdpWaypoints[pi];
                                var dToA = L.latLng(pt.lat, pt.lng).distanceTo(L.latLng(waypoints[gi].lat, waypoints[gi].lng));
                                var dToB = L.latLng(pt.lat, pt.lng).distanceTo(L.latLng(waypoints[gi + 1].lat, waypoints[gi + 1].lng));
                                // Point is between the gap endpoints
                                if (dToA > 10000 && dToB > 10000 && dToA < gapM && dToB < gapM) {
                                    var perpD = perpendicularDist(pt, waypoints[gi], waypoints[gi + 1]);
                                    if (perpD > bestDist) {
                                        bestDist = perpD;
                                        bestPt = pt;
                                    }
                                }
                            }
                            if (bestPt) {
                                waypoints.splice(gi + 1, 0, bestPt);
                                changed = true;
                                console.warn('Route gap remediated:', segFrom.name, '\u2192', segTo.name, Math.round(gapKm) + 'km');
                                break;
                            }
                        }
                    }
                }
            }

            renderRoute(waypoints, segFrom, segTo, routeGroup, arrowMarkers);

            // Collect stats for debug logging
            var maxSegKm = 0;
            for (var si = 0; si < waypoints.length - 1; si++) {
                var segM = L.latLng(waypoints[si].lat, waypoints[si].lng)
                    .distanceTo(L.latLng(waypoints[si + 1].lat, waypoints[si + 1].lng));
                if (segM / 1000 > maxSegKm) maxSegKm = segM / 1000;
            }
            routeStats.push({
                from: segFrom.name,
                to: segTo.name,
                waypointCount: waypoints.length,
                maxSegmentKm: Math.round(maxSegKm),
                transitPhotoCount: routePhotos.length
            });
        }

        // Debug: log route statistics
        if (routeStats.length > 0) {
            console.log('Smart Route Lines:');
            if (typeof console.table === 'function') {
                console.table(routeStats);
            } else {
                for (var li = 0; li < routeStats.length; li++) {
                    console.log(' ', routeStats[li].from, '\u2192', routeStats[li].to,
                        '| waypoints:', routeStats[li].waypointCount,
                        '| maxSegKm:', routeStats[li].maxSegmentKm,
                        '| photos:', routeStats[li].transitPhotoCount);
                }
            }
        }

        // Arrow visibility based on zoom level
        map.on('zoomend', function () {
            var zoom = map.getZoom();
            for (var ai = 0; ai < arrowMarkers.length; ai++) {
                var el = arrowMarkers[ai].getElement ? arrowMarkers[ai].getElement() : null;
                if (el) {
                    el.style.display = zoom < 4 ? 'none' : '';
                }
            }
        });

        return routeGroup;
    }

    return buildRoutes;
})();
