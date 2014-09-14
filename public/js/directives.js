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
      var keys, data;

      var graph = d3.select(element[0])
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

      var margin = 20;
      var width = element.find('svg').width() - (margin * 2);
      var height = element.find('svg').height() - (margin * 2);

      var scale = {
        x: d3.time.scale().range([margin * 2, width]),
        y: d3.scale.linear().range([height, margin])
      };

      var axes = {
        x: d3.svg.axis()
          .scale(scale.x)
          .orient('bottom')
          .tickFormat(d3.time.format('%H:%M')),
        y: d3.svg.axis()
          .scale(scale.y)
          .orient('left')
      };

      var line = d3.svg.line()
        .x(function (d) { return scale.x(d.timestamp); })
        .y(function (d) { return scale.y(d.value); });

      var prepareData = function () {
        // enumerate series keys
        keys = Object.keys(scope.data[0]).filter(function (v, i) { return i != 0; });

        // transpose the data into arrays
        data = keys.map(function (series) {
          return {
            name: series,
            values: scope.data.map(function (v) {
              return {
                timestamp: new Date(v.timestamp),
                value: +v[series]
              }
            })
          };
        });

        // update scale domains
        scale.x.domain(d3.extent(scope.data, function (v) { return v.timestamp }));

        // todo: remove 120% scaling factor in favor of a more elegant way to add headroom
        scale.y.domain([0, 1.2 * d3.max(data, function (v) {
          return d3.max(v.values, function (v) {
            return v.value
          });
        })
        ]);
      };

      // draw x- and y- axis
      var drawAxes = function () {
        graph.append('g')
          .attr('class', 'axis axis-x')
          .attr('transform', 'translate(0, ' + height + ')')
          .call(axes.x);

        graph.append('g')
          .attr('class', 'axis axis-y')
          .attr('transform', 'translate(' + (margin * 2) + ', 0)')
          .call(axes.y);
      };

      var drawData = function () {
        // draw series elements
        var series = graph.selectAll('.series')
          .data(data)
          .enter()
          .append('g')
          .attr('class', 'series');

        // draw path for each series
        var path = series.append('path')
          .attr('class', function(d) {
            return 'line line-' + d.name;
          })
          .attr('d', function (d) {
            return line(d.values);
          });
      };

      // refresh when data changes
      scope.$watch('data', function(data) {
        graph.selectAll('*').remove();
        scope.data = data;

        // can't render anything useful until we have 2 data points
        if (scope.data && scope.data.length > 1) {
          prepareData();
          drawAxes();
          drawData();
        }
      }, true);
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