(function () {

    angular.module('katGui.alarms', ['katGui.util'])
        .controller('AlarmsCtrl', AlarmsCtrl)
        .filter('alarmsFilter', function () {
            return function (alarms, showCleared) {
                var filtered = [];
                for (var i = 0; i < alarms.length; i++) {
                    var alarm = alarms[i];
                    if (alarm.priority !== 'known' &&
                        (alarm.priority === 'cleared' && showCleared || alarm.priority !== 'cleared')) {
                        filtered.push(alarm);
                    }
                }
                return filtered;
            };
        })
        .filter('alarmsKnownFilter', function () {
            return function (alarms, showKnownNominalAlarms, showKnownMaintenanceAlarms) {
                var filtered = [];
                for (var i = 0; i < alarms.length; i++) {
                    var alarm = alarms[i];
                    if (alarm.priority === 'known' &&
                        (alarm.severity === 'nominal' && showKnownNominalAlarms || alarm.severity !== 'nominal') &&
                        (alarm.severity === 'maintenance' && showKnownMaintenanceAlarms || alarm.severity !== 'maintenance')) {
                        filtered.push(alarm);
                    }
                }
                return filtered;
            };
        });

    function AlarmsCtrl($rootScope, $scope, ControlService, AlarmsService, ConfigService, $log) {

        var vm = this;

        ConfigService.loadAggregateSensorDetail();

        vm.alarmsOrderByFields = [
            {label: 'Severity', value: 'severity'},
            {label: 'Timestamp', value: 'timestamp'},
            {label: 'Priority', value: 'priority'},
            {label: 'Name', value: 'name'},
            {label: 'Message', value: 'value'}
        ];
        vm.knownAlarmsOrderByFields = [
            {label: 'Severity', value: 'severity'},
            {label: 'Timestamp', value: 'timestamp'},
            {label: 'Priority', value: 'priority'},
            {label: 'Name', value: 'name'},
            {label: 'Message', value: 'value'}
        ];

        vm.setAlarmsOrderBy = function (column, reverse) {
            var newOrderBy = _.findWhere(vm.alarmsOrderByFields, {value: column});
            if (newOrderBy.reverse === undefined) {
                newOrderBy.reverse = reverse || false;
            } else {
                newOrderBy.reverse = !newOrderBy.reverse;
            }
            vm.alarmsOrderBy = newOrderBy;
        };

        vm.setAlarmsOrderBy('timestamp', true);

        vm.setKnownAlarmsOrderBy = function (column, reverse) {
            var newOrderBy = _.findWhere(vm.knownAlarmsOrderByFields, {value: column});
            if (newOrderBy.reverse === undefined) {
                newOrderBy.reverse = reverse || false;
            } else {
                newOrderBy.reverse = !newOrderBy.reverse;
            }
            vm.knownAlarmsOrderBy = newOrderBy;
        };

        vm.setKnownAlarmsOrderBy('timestamp', true);

        vm.toggleSelectAllKnownAlarms = function () {
            vm.selectAllKnownAlarms = !vm.selectAllKnownAlarms;
            $scope.filteredKnownAlarms.forEach(function (item) {
                item.selected = vm.selectAllKnownAlarms;
            });
        };

        vm.toggleSelectAllAlarms = function () {
            vm.selectAllAlarms = !vm.selectAllAlarms;
            $scope.filteredAlarms.forEach(function (item) {
                item.selected = vm.selectAllAlarms;
            });
        };

        vm.clearSelectedAlarms = function () {
            AlarmsService.alarmsData.forEach(function (item) {
                if (item.selected) {
                    ControlService.clearAlarm(item.name);
                }
            });
        };

        vm.clearAlarm = function (alarm) {
            ControlService.clearAlarm(alarm.name);
        };

        vm.acknowledgeSelectedAlarms = function () {
            AlarmsService.alarmsData.forEach(function (item) {
                if (item.selected) {
                    ControlService.acknowledgeAlarm(item.name);
                }
            });
        };

        vm.acknowledgeAlarm = function (alarm) {
            ControlService.acknowledgeAlarm(alarm.name);
        };

        vm.knowSelectedAlarms = function () {
            AlarmsService.alarmsData.forEach(function (item) {
                if (item.selected) {
                    ControlService.addKnownAlarm(item.name);
                }
            });
        };

        vm.knowAlarm = function (alarm) {
            ControlService.addKnownAlarm(alarm.name);
        };

        vm.cancelKnowSelectedAlarms = function () {
            AlarmsService.alarmsData.forEach(function (item) {
                if (item.selected) {
                    ControlService.cancelKnownAlarm(item.name);
                }
            });
        };

        vm.cancelKnownAlarm = function (alarm) {
            ControlService.cancelKnownAlarm(alarm.name);
        };

        vm.keydown = function (e, key) {
            if (key === 27) {
                //escape
                AlarmsService.alarmsData.forEach(function (item) {
                    item.selected = false;
                });
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        vm.viewAlarmSystemConfig = function ($event) {
            ConfigService.getConfigFileContents('static/alarms/common.conf')
                .success(function (commonResult) {
                    ConfigService.getConfigFileContents(ConfigService.systemConfig.kataware.alarms)
                        .success(function (alarmsResult) {
                            var displayResult = JSON.parse(commonResult) + '\n\n' + JSON.parse(alarmsResult);
                            $rootScope.showPreDialog('System Config for Alarms', displayResult, $event);
                        })
                        .error(function (result) {
                            $log.error(result);
                        })
                })
                .error(function (result) {
                    $log.error(result);
                });
        };

        vm.showAggregateSensorDetail = function (item) {
            if (item.value.indexOf('agg_') > -1) {
                var sensorName = item.value.split(',')[2].split(' ')[0];
                if (ConfigService.aggregateSensorDetail[sensorName]) {
                    $rootScope.showAggregateSensorsDialog('Aggregate Sensor ' + sensorName + ' Details', JSON.stringify(ConfigService.aggregateSensorDetail[sensorName], null, 4));
                } else {
                    $rootScope.showSimpleToast('Cannot find aggregate sensor details in ConfigService ' + sensorName);
                }
            }
        };

        vm.viewAlarmsHistory = function () {
            AlarmsService.tailAlarmsHistory();
        };

        vm.unbindShortcuts = $rootScope.$on("keydown", vm.keydown);
        $scope.$on('$destroy', function () {
            vm.unbindShortcuts('keydown');
        });
    }
})();
