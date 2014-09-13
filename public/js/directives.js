'use strict';

var directiveModule = angular.module('uchiwa.directives', []);

directiveModule.directive('lineChart', ['d3', function (d3) {
  return {
    replace: true,
    restrict: 'E',
    scope: {
      data: '='
    },
    link: function (scope, element) {
      var graph = d3.select(element[0])
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

      var scale = {
        x: d3.time.scale().range([0, element.find('svg').width()]),
        y: d3.scale.linear().range([element.find('svg').height(), 0])
      };

      var line = d3.svg.line()
        .interpolate('basis')
        .x(function (d) { return scale.x(d.timestamp); })
        .y(function (d) { return scale.y(d.value); });

      var draw = function () {
        var seriesKeys = Object.keys(scope.data[0]).filter(function (v, i) { return i != 0; });

        // get one color for each present series
        var colors = d3.scale.category10();
        colors.domain(seriesKeys);

        // transpose data to per-series structure
        var seriesData = colors.domain().map(function (series) {
          return {
            name: series,
            values: scope.data.map(function (v) {
              return {
                timestamp: v.timestamp,
                value: +v[series]
              }
            })
          };
        });

        // update scale domains
        scale.x.domain(d3.extent(scope.data, function (v) { return v.timestamp; }));
        scale.y.domain([
          d3.min(seriesData, function (v) { return d3.min(v.values, function (v) { return v.value }); }),
          d3.max(seriesData, function (v) { return d3.max(v.values, function (v) { return v.value }); })
        ]);

        // create series elements
        var series = graph.selectAll('.series')
          .data(seriesData)
          .enter()
          .append('g')
          .attr('class', 'series');

        // create lines for each series
        var path = series.append('path')
          .attr('class', 'line')
          .attr('d', function (d) {
            return line(d.values);
          })
          .style("stroke", function(d) { return colors(d.name); });
      };

      scope.$watch('data', function() {
        graph.selectAll('*').remove();

        if (!scope.data) {
          return;
        }

        draw();
      });
    }
  }
}]);

directiveModule.directive('bootstrapTooltip', function () {
  return {
    restrict: 'EA',
    link: function (scope, element) {
      element.tooltip();
    }
  };
});

directiveModule.directive('siteTheme', ['$cookieStore', 'settings', function ($cookieStore, settings) {
  return {
    restrict: 'EA',
    link: function (scope, element) {
      scope.themes = [
        {
          name: 'default'
        },
        {
          name: 'dark'
        }
      ];
      var lookupTheme = function (themeName) {
        return scope.themes[scope.themes.map(function (t) {
          return t.name;
        }).indexOf(themeName)];
      };
      var setTheme = function (theme) {
        var themeName = angular.isObject(theme) && angular.isDefined(theme.name) ? theme.name : settings.theme;
        scope.currentTheme = lookupTheme(themeName);
        $cookieStore.put('currentTheme', scope.currentTheme);
        var fullThemeName = 'uchiwa-' + scope.currentTheme.name;
        element.attr('href', 'css/' + fullThemeName + '/' + fullThemeName + '.css');
      };
      scope.$on('theme:changed', function (event, theme) {
        setTheme(theme);
      });

      setTheme($cookieStore.get('currentTheme'));
    }
  };
}]);

directiveModule.directive('statusGlyph', function() {
  return {
    restrict: 'EA',
    link: function(scope, element, attrs) {
      var style;

      function updateGlyph() {
        element.removeAttr('class');
        element.addClass('fa fa-fw');
        switch(style) {
          case 'success':
            element.addClass('fa-check-circle');
            break;
          case 'warning':
            element.addClass('fa-exclamation-circle');
            break;
          case 'danger':
            element.addClass('fa-bomb');
            break;
          case 'muted':
            element.addClass('fa-question-circle');
            break;
        }
        element.addClass('text-' + style);
      }

      scope.$watch(attrs.statusGlyph, function(value) {
        // convert sensu state to CSS class name
        var styleOverrides = {
          'critical': 'danger',
          'unknown': 'muted'
        };
        style = styleOverrides[value] ? styleOverrides[value] : value;
        updateGlyph();
      });
    }
  };
});