// karma.conf.js
module.exports = function(config) {
  config.set({
    basePath : '../',
    frameworks: ['jasmine'],
    files : [
      'lib/jquery/dist/jquery.js',
      'lib/underscore/underscore.js',
      'lib/angular/angular.js',
      'lib/angular-cookies/angular-cookies.js',
      'lib/angular-route/angular-route.js',
      'lib/angular-mocks/angular-mocks.js',
      'lib/angular-socket.io-mock/angular-socket.io-mock.js',
      'lib/toastr/toastr.min.js',
      'lib/angular-bootstrap/ui-bootstrap-tpls.min.js',
      'src/js/**/*.js',
      'test/unit/**/*.js'
    ],
    reporters: ['junit', 'coverage', 'dots'],
    coverageReporter: {
      type: 'html',
      dir: 'build/coverage'
    },
    preprocessors: {
      'src/js/**/*.js': ['coverage']
    },
    junitReporter: {
      outputFile: 'build/unit/test-results.xml'
    },
    port: 8876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    captureTimeout: 60000,
    singleRun: true
  });
};
