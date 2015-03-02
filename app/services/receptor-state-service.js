(function () {

    angular.module('katGui')
        .service('ReceptorStateService', ReceptorStateService);

    function ReceptorStateService($rootScope, MonitorService, ConfigService) {

        var api = {receptorsData: []};

        ConfigService.getReceptorList()
            .then(function (receptors) {
                receptors.forEach(function (receptor) {
                    api.receptorsData.push({name: receptor, inhibited: false});
                    MonitorService.subscribeToReceptorUpdates();
                });

            }, function (result) {
                $rootScope.showSimpleDialog('Error', 'Error retrieving receptor list, please contact CAM support');
                console.error(result);
            });

        api.receptorMessageReceived = function (message) {
            var sensorNameList = message.name.split(':');
            var receptor = sensorNameList[0];
            var sensorName = sensorNameList[1];
            api.receptorsData.forEach(function (item) {

                if (item.name === receptor) {
                    if (sensorName === 'mode' && item.status !== message.value.value) {
                        item.state = message.value.value;
                    } else if (sensorName === 'inhibited' && item.inhibited !== message.value.value) {
                        item.inhibited = message.value.value;
                    }

                    item.lastUpdate = moment(message.value.timestamp, 'X').format('HH:mm:ss DD-MM-YYYY');
                }

            });
        };

        return api;
    }
})();
