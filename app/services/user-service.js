(function () {

    angular.module('katGui.services')
        .service('UserService', UserService);

    function UserService($http, $q, $rootScope, $log, NotifyService) {

        function urlBase() {
            return $rootScope.portalUrl? $rootScope.portalUrl + '/katauth' : '';
        }

        var api = {};
        api.users = [];

        api.listUsers = function () {

            var def = $q.defer();

            $http(createRequest('get', urlBase() + '/user/list')).then(
                function (result) {

                    if (result && result.data) {
                        api.users.splice(0, api.users.length);
                        result.data.forEach(function (user) {
                            api.users.push(user);
                        });
                        def.resolve();
                    } else {
                        $log.error('Could not retrieve any users.');
                        def.reject();
                    }
                }, function (error) {
                    $log.error(error);
                });

            return def.promise;
        };

        api.createUser = function (user) {
            $http(createRequest('post',
                urlBase() + '/user/add',
                {
                    name: user.name,
                    email: user.email,
                    roles: user.roles.join(',')
                }))
                .then(function (result) {
                    var oldUser = _.findWhere(api.users, {email: user.email});
                    for (var attr in result.data) {
                        oldUser[attr] = result.data[attr];
                    }
                    oldUser.temp = false;
                    oldUser.editing = false;
                    NotifyService.showSimpleToast("Created user");
                }, function (result) {
                    _.findWhere(api.users, {id: user.id}).editing = true;
                    NotifyService.showSimpleDialog("Error creating user", result);
                });
        };

        api.updateUser = function (user) {
            $http(createRequest('post', urlBase() + '/user/modify/' + user.id,
                {
                    name: user.name,
                    email: user.email,
                    activated: user.activated,
                    roles: user.roles.join(',')
                }))
                .then(function (result) {
                    var oldUser = _.findWhere(api.users, {id: result.data.id});
                    for (var attr in result.data) {
                        oldUser[attr] = result.data[attr];
                    }
                    NotifyService.showSimpleToast("Updated user " + result.data.name);
                }, function (result) {
                    NotifyService.showSimpleDialog("Error sending request", "Error updating user " + result.data.name);
                });
        };

        api.resetPassword = function (user, passwordHash) {
            return $http(createRequest('post',
                urlBase() + '/user/reset/' + user.id,
                {'password': passwordHash}));
        };

        api.addTempCreatedUser = function (user) {
            api.users.push(user);
        };

        api.removeTempUser = function (user) {
            api.users.splice(_.indexOf(api.users, {id: user.id}), 1);
        };

        function createRequest(method, url, data) {
            var req = {
                method: method,
                url: url,
                headers: {
                    'Authorization': 'CustomJWT ' + $rootScope.jwt
                }
            };

            if (data && method === 'post') {
                req.headers['Content-Type'] = 'application/json';
                req.data = data;
            }

            return req;
        }

        return api;
    }

})();
