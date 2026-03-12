/* ═══════════════════════════════════════════════════════════════
   Shared Trip Data Model — single canonical source for region
   definitions, photo-to-segment assignment, and date indexing.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── Private state ── */
    var _regions = [];
    var _regionMap = {};   // id → region
    var _clusters = [];
    var _dateIndex = {};
    var _initialized = false;

    /* ── Canonical region definitions ── */
    var REGION_SECTIONS = [
        { id: 'uk',                 label: 'UK',                    jsonRegions: ['UK - London'] },
        { id: 'copenhagen-pt-1',    label: 'Copenhagen Pt.\u00a01', jsonRegions: ['Copenhagen (Visit 1)'] },
        { id: 'baden-wurttemberg',  label: 'Baden-W\u00fcrttemberg', jsonRegions: ['Heidelberg'] },
        { id: 'munich',            label: 'Munich',                jsonRegions: ['Munich'] },
        { id: 'prague',            label: 'Prague',                jsonRegions: ['Prague'] },
        { id: 'dresden-meissen',   label: 'Dresden / Mei\u00dfen', jsonRegions: ['Dresden / Mei\u00dfen'] },
        { id: 'berlin-hamburg',    label: 'Berlin / Hamburg',       jsonRegions: ['Berlin', 'Hamburg'] },
        { id: 'copenhagen-pt-2',   label: 'Copenhagen Pt.\u00a02', jsonRegions: ['Copenhagen (Visit 2)'] }
    ];

    /* ══════════════════════════════════════
       Region enrichment from itinerary data
       ══════════════════════════════════════ */

    function buildRegions(itineraryData) {
        if (!itineraryData || !itineraryData.regions) {
            // No itinerary — return static definitions with empty derived fields
            return REGION_SECTIONS.map(function (cfg) {
                return {
                    id: cfg.id,
                    label: cfg.label,
                    jsonRegions: cfg.jsonRegions,
                    center: { lat: 0, lng: 0 },
                    startDate: '',
                    endDate: '',
                    days: [],
                    summary: '',
                    heroPhoto: ''
                };
            });
        }

        var regionMap = {};
        itineraryData.regions.forEach(function (r) {
            regionMap[r.name] = r;
        });

        return REGION_SECTIONS.map(function (cfg) {
            var days = [];
            var lats = [], lngs = [];
            var summary = '';
            var heroPhoto = '';

            cfg.jsonRegions.forEach(function (name) {
                var r = regionMap[name];
                if (!r) return;
                lats.push(r.lat);
                lngs.push(r.lng);
                if (r.summary) summary = r.summary;
                if (r.heroPhoto) heroPhoto = r.heroPhoto;
                r.days.forEach(function (d) {
                    days.push({ date: d.date, notes: d.notes || '' });
                });
            });

            // Sort and deduplicate days
            days.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
            var seen = {};
            days = days.filter(function (d) {
                if (seen[d.date]) return false;
                seen[d.date] = true;
                return true;
            });

            var avgLat = lats.reduce(function (s, v) { return s + v; }, 0) / (lats.length || 1);
            var avgLng = lngs.reduce(function (s, v) { return s + v; }, 0) / (lngs.length || 1);

            return {
                id: cfg.id,
                label: cfg.label,
                jsonRegions: cfg.jsonRegions,
                center: { lat: avgLat, lng: avgLng },
                startDate: days.length ? days[0].date : '',
                endDate: days.length ? days[days.length - 1].date : '',
                days: days,
                summary: summary,
                heroPhoto: heroPhoto
            };
        });
    }

    /* ══════════════════════════════════════
       Photo-to-segment assignment
       ══════════════════════════════════════ */

    function assignPhotosToTripSegments(photos, segments) {
        // Sort photos by datetime or date
        var sorted = photos.slice().sort(function (a, b) {
            var aTime = a.datetime || a.date || '';
            var bTime = b.datetime || b.date || '';
            return aTime.localeCompare(bTime);
        });

        // Parse segment boundaries
        var parsedSegments = segments.map(function (seg, idx) {
            return {
                index: idx,
                name: seg.name,
                start: new Date(seg.start),
                end: new Date(seg.end),
                color: seg.color,
                lat: seg.lat,
                lng: seg.lng,
                photos: []
            };
        });

        // Assign each photo to a segment
        for (var i = 0; i < sorted.length; i++) {
            var photo = sorted[i];
            var photoTime = null;

            // Try to parse datetime first, fall back to date
            if (photo.datetime) {
                photoTime = new Date(photo.datetime);
            } else if (photo.date) {
                // Date-only: assume noon for comparison
                photoTime = new Date(photo.date + 'T12:00:00');
            }

            if (!photoTime || isNaN(photoTime.getTime())) {
                // No valid time, skip assignment
                photo.cityIndex = -1;
                photo.cityName = 'Unknown';
                photo.cityColor = '#999';
                continue;
            }

            // Find matching segment
            var matched = false;
            for (var s = 0; s < parsedSegments.length; s++) {
                var seg = parsedSegments[s];
                if (photoTime >= seg.start && photoTime < seg.end) {
                    photo.cityIndex = s;
                    photo.cityName = seg.name;
                    photo.cityColor = seg.color;
                    seg.photos.push(photo);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                photo.cityIndex = -1;
                photo.cityName = 'Unknown';
                photo.cityColor = '#999';
            }
        }

        // Build cluster-like structure for compatibility
        var clusters = parsedSegments.map(function (seg) {
            var dates = seg.photos.map(function (p) { return p.date || ''; }).filter(function (d) { return d; }).sort();
            return {
                photos: seg.photos,
                centroidLat: seg.lat,
                centroidLng: seg.lng,
                cityName: seg.name,
                color: seg.color,
                startDate: dates[0] || '',
                endDate: dates[dates.length - 1] || ''
            };
        });

        return clusters;
    }

    /* ══════════════════════════════════════
       Date index construction
       ══════════════════════════════════════ */

    function buildDateIndex(photos) {
        var index = {};
        for (var di = 0; di < photos.length; di++) {
            var p = photos[di];
            var d = p.date;
            if (!d) continue;
            if (!index[d]) {
                index[d] = {
                    photos: [],
                    segmentName: p.cityName || 'Unknown',
                    segmentColor: p.cityColor || '#999',
                    segmentIndex: p.cityIndex != null ? p.cityIndex : -1
                };
            }
            index[d].photos.push(p);
        }
        // Sort photos within each date by datetime
        var dateKeys = Object.keys(index).sort();
        for (var dk = 0; dk < dateKeys.length; dk++) {
            index[dateKeys[dk]].photos.sort(function (a, b) {
                return (a.datetime || a.date || '').localeCompare(b.datetime || b.date || '');
            });
        }
        return index;
    }

    /* ══════════════════════════════════════
       Initialization
       ══════════════════════════════════════ */

    function init(itineraryData, photos, tripSegments) {
        // Build enriched regions
        _regions = buildRegions(itineraryData);
        _regionMap = {};
        for (var i = 0; i < _regions.length; i++) {
            _regionMap[_regions[i].id] = _regions[i];
        }

        // Assign photos to segments (mutates photo objects)
        _clusters = assignPhotosToTripSegments(photos, tripSegments);

        // Build date index (reads mutated photo fields)
        _dateIndex = buildDateIndex(photos);

        _initialized = true;
    }

    /* ══════════════════════════════════════
       Public API
       ══════════════════════════════════════ */

    function getRegions() {
        return _regions;
    }

    function getRegion(id) {
        return _regionMap[id];
    }

    function getClusters() {
        return _clusters;
    }

    function getDateIndex() {
        return _dateIndex;
    }

    function getPhotosForDateRange(startDate, endDate) {
        var result = [];
        var keys = Object.keys(_dateIndex).sort();
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] >= startDate && keys[i] <= endDate) {
                var entry = _dateIndex[keys[i]];
                for (var j = 0; j < entry.photos.length; j++) {
                    result.push(entry.photos[j]);
                }
            }
        }
        return result;
    }

    /* ── Export ── */
    window.TripModel = {
        init:                  init,
        getRegions:            getRegions,
        getRegion:             getRegion,
        getClusters:           getClusters,
        getDateIndex:          getDateIndex,
        getPhotosForDateRange: getPhotosForDateRange
    };

})();
