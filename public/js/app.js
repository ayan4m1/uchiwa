'use strict';

angular.module('uchiwa', [
  'uchiwa.controllers',
  'uchiwa.constants',
  'uchiwa.filters',
  'uchiwa.services',
  'uchiwa.directives',
  // Angular dependencies
  'ngCookies',
  'ngRoute',
  // 3rd party dependencies
  'btford.socket-io',
  'ui.bootstrap'
]);

angular.module('uchiwa').config(['$routeProvider', 'notificationProvider',
  function ($routeProvider, notificationProvider) {
    $routeProvider
      .when('/', {redirectTo: function () { return '/events'; }})
      .when('/dashboard', {templateUrl: 'partials/dashboard/index.html', reloadOnSearch: false, controller: 'dashboard'})
      .when('/events', {templateUrl: 'partials/events/index.html', reloadOnSearch: false, controller: 'events'})
      .when('/client/:dcId/:clientId', {templateUrl: 'partials/client/index.html', reloadOnSearch: false, controller: 'client'})
      .when('/clients', {templateUrl: 'partials/clients/index.html', reloadOnSearch: false, controller: 'clients'})
      .when('/checks', {templateUrl: 'partials/checks/index.html', reloadOnSearch: false, controller: 'checks'})
      .when('/info', {templateUrl: 'partials/info/index.html', controller: 'info'})
      .when('/stashes', {templateUrl: 'partials/stashes/index.html', reloadOnSearch: false, controller: 'stashes'})
      .when('/settings', {templateUrl: 'partials/settings/edit.html', controller: 'settings'})
      .otherwise('/');
    notificationProvider.setOptions({
      'positionClass': 'toast-bottom-right'
    });
  }]);
