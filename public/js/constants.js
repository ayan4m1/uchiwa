var constantModule = angular.module('uchiwa.constants', []);

/**
 * Settings
 */
constantModule.constant('settings', {
  theme: 'default',
  palette: 'default'
});

/**
 * Version
 */
constantModule.constant('version', {
  uchiwa: '0.2.1'
});
