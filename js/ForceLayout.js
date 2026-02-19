/*
  ForceLayout - Force-directed layout for photo markers
  Repels overlapping unclustered markers and draws anchor lines to true GPS positions.
*/
var ForceLayout = (function () {
    var REPULSION_STRENGTH = 1.5;
    var SPRING_STRENGTH = 0.08;
    var DAMPING = 0.85;
    var MAX_ITERATIONS = 60;
    var FPS_INTERVAL = 1000 / 30;

    var _nodes = [];
    var _lines = [];
    var _map = null;
    var _timer = null;
    var _iteration = 0;
    var _lineGroup = null;

    function stop() {
        if (_timer) {
            cancelAnimationFrame(_timer);
            _timer = null;
        }
        // Restore original positions
        for (var i = 0; i < _nodes.length; i++) {
            var n = _nodes[i];
            if (n.marker && n.origLatLng) {
                n.marker.setLatLng(n.origLatLng);
            }
        }
        // Remove anchor lines
        if (_lineGroup && _map) {
            _map.removeLayer(_lineGroup);
        }
        _lineGroup = null;
        _nodes = [];
        _lines = [];
        _iteration = 0;
    }

    function run(map, clusterGroup, iconSize) {
        stop();
        _map = map;

        // Skip if spiderfied
        if (clusterGroup._spiderfied) return;

        var bounds = map.getBounds();
        var markers = [];

        // Collect visible unclustered markers
        clusterGroup.eachLayer(function (layer) {
            if (!(layer instanceof L.Marker)) return;
            if (!layer._icon) return;
            if (!bounds.contains(layer.getLatLng())) return;
            markers.push(layer);
        });

        if (markers.length < 2 || markers.length > 50) return;

        // Build nodes
        _nodes = [];
        for (var i = 0; i < markers.length; i++) {
            var m = markers[i];
            var ll = m.getLatLng();
            var px = map.latLngToLayerPoint(ll);
            _nodes.push({
                marker: m,
                origLatLng: L.latLng(ll.lat, ll.lng),
                origPx: { x: px.x, y: px.y },
                px: { x: px.x, y: px.y },
                vx: 0,
                vy: 0
            });
        }

        // Draw anchor polylines
        _lineGroup = L.layerGroup();
        _lines = [];
        for (var j = 0; j < _nodes.length; j++) {
            var line = L.polyline(
                [_nodes[j].origLatLng, _nodes[j].origLatLng],
                { color: '#999', weight: 1, opacity: 0.5, dashArray: '4, 4', interactive: false }
            );
            _lines.push(line);
            _lineGroup.addLayer(line);
        }
        _lineGroup.addTo(map);

        _iteration = 0;
        var minDist = (iconSize || 90) * 1.1;
        var lastTime = 0;

        function tick(timestamp) {
            if (!lastTime) lastTime = timestamp;
            if (timestamp - lastTime < FPS_INTERVAL) {
                _timer = requestAnimationFrame(tick);
                return;
            }
            lastTime = timestamp;

            if (_iteration >= MAX_ITERATIONS) {
                _timer = null;
                return;
            }
            _iteration++;

            var totalVelocity = 0;

            // Pairwise repulsion
            for (var a = 0; a < _nodes.length; a++) {
                for (var b = a + 1; b < _nodes.length; b++) {
                    var dx = _nodes[b].px.x - _nodes[a].px.x;
                    var dy = _nodes[b].px.y - _nodes[a].px.y;
                    var dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
                    if (dist < minDist) {
                        var force = REPULSION_STRENGTH * (minDist - dist) / dist;
                        var fx = dx * force;
                        var fy = dy * force;
                        _nodes[a].vx -= fx;
                        _nodes[a].vy -= fy;
                        _nodes[b].vx += fx;
                        _nodes[b].vy += fy;
                    }
                }
            }

            // Spring to origin + integration
            for (var k = 0; k < _nodes.length; k++) {
                var n = _nodes[k];
                var sx = (n.origPx.x - n.px.x) * SPRING_STRENGTH;
                var sy = (n.origPx.y - n.px.y) * SPRING_STRENGTH;
                n.vx = (n.vx + sx) * DAMPING;
                n.vy = (n.vy + sy) * DAMPING;
                n.px.x += n.vx;
                n.px.y += n.vy;
                totalVelocity += Math.abs(n.vx) + Math.abs(n.vy);

                // Update marker position
                var newLL = map.layerPointToLatLng(L.point(n.px.x, n.px.y));
                n.marker.setLatLng(newLL);

                // Update anchor line
                if (_lines[k]) {
                    _lines[k].setLatLngs([n.origLatLng, newLL]);
                }
            }

            // Stop when settled
            if (totalVelocity < 0.5) {
                _timer = null;
                return;
            }

            _timer = requestAnimationFrame(tick);
        }

        _timer = requestAnimationFrame(tick);
    }

    return { run: run, stop: stop };
})();
