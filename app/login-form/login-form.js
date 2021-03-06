(function () {

    angular.module('katGui')
        .controller('LoginFormCtrl', LoginFormCtrl);

    function LoginFormCtrl(SessionService, $localStorage, $rootScope) {

        var vm = this;
        vm.loginResult = "";
        vm.loginDetails = "";
        vm.loginAs = $localStorage.loginAs? $localStorage.loginAs : "read_only";
        vm.credentials = {
            username: '',
            password: ''
        };

        vm.verify = function () {
            if ($rootScope.devMode) {
                $localStorage.devModePortalURL = $rootScope.portalUrl;
            }
            $localStorage.loginAs = vm.loginAs;
            $rootScope.credentials = vm.credentials;
            SessionService.verify(vm.credentials.username, vm.credentials.password, vm.loginAs);
            $rootScope.getSystemConfig();
        };

        vm.portalUrlBlur = function () {
            if ($rootScope.portalUrl.length > 0 && !$rootScope.portalUrl.startsWith('http://')) {
                $rootScope.portalUrl = 'http://' + $rootScope.portalUrl;
            }
            $rootScope.getSystemConfig(true);
        };

        $rootScope.getSystemConfig();
    }
})();
