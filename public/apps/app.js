var myApp = angular.module('imageboardApp', ['ui.router', 'ui.bootstrap'])

.controller('homePageController', function($scope, $sce, serviceHttp, serviceSocial) {
    serviceHttp.getPhotos().then((res) => {
        $scope.photos = res;
        $scope.paginatedPhotos = [],
        $scope.currentPage = 1,
        $scope.numPerPage = 6,
        $scope.maxSize = 5;

        $scope.$watch('currentPage + numPerPage', () => {
            var begin = (($scope.currentPage - 1) * $scope.numPerPage), //determine the first and last images on the page
                end = begin + $scope.numPerPage;

            $scope.paginatedPhotos = $scope.photos.slice(begin, end);
            $scope.paginatedPhotos = serviceSocial.addButtonsForHashtags($scope.paginatedPhotos);
        });
    });

    $scope.searchHashtag = (hashtag) => {
        let hashtagString;
        if (hashtag == undefined) { //if no hashtag in search, return all photos
            serviceHttp.getPhotos().then((res) => {
                $scope.photos = res;
            });
        } else { //format hashtag for search
            if (hashtag.charAt(0) == '#') {
                hashtagString = hashtag.substr(1);
            } else {
                hashtagString = hashtag;
            }
            serviceHttp.getHashtaggedImages(hashtagString).then((res) => {
                delete $scope.hashtag;
                $scope.photos = res;
            });
        }
        $scope.$watch('currentPage + numPerPage', () => {
            var begin = (($scope.currentPage - 1) * $scope.numPerPage), //determine the first and last images on the page for hashtag search results
                end = begin + $scope.numPerPage;

            $scope.paginatedPhotos = $scope.photos.slice(begin, end);
            $scope.paginatedPhotos = serviceSocial.addButtonsForHashtags($scope.paginatedPhotos);
        });
    };
})

.controller('singleImageController', function($scope, $http, $stateParams, serviceHttp, serviceSocial) {
    serviceHttp.getPhoto($stateParams.id).then((res) => {
        $scope.photo = res[0];
    });

    serviceHttp.getComments($stateParams.id).then((res) => {
        $scope.comments = res;
    });


    $scope.like = () => { //like a photo
        serviceSocial.likeImage($scope.photo.id).then((likesCounter) => {
            $('#image-likes').html(`${likesCounter}`);
        });
    };

    $scope.submit = (comment) => { //submit comment for a photo
        var commentData = {
            photoID: $scope.photo.id,
            name: comment.name,
            comment: comment.text
        };

        serviceSocial.addComment(commentData).then((addedCommentData) => {
            $('.comments-container').prepend(`
                <div class="comment">
                    <p>${addedCommentData.created_at}
                    <p><span class="comment-name">${addedCommentData.name}</span> ${addedCommentData.comment}</p>
                </div>
            `);
            delete $scope.comment;
        });

    };
})

.controller('uploadImageController', function($scope, $http, serviceHttp) {
    $scope.upload = (image) => { //upload an image
        var file = $('input[type="file"]').get(0).files[0];
        var formData = new FormData();
        formData.append('file', file);
        formData.append('username', image.username);
        formData.append('title', image.title);
        formData.append('description', image.description);

        serviceHttp.uploadImage(formData).then(() => {
            delete $scope.image;
        }).catch((err) => {
            console.log(err);
        });

    };
})

.factory('serviceHttp', ['$http', ($http) => {
    var factory = {
        getPhotos: () => {
            var data = $http.get('/photos').then((res) => {
                return res.data;
            });
            return data;
        },
        getPhoto: (id) => {
            var data = $http.get(`/photo/${id}`).then((res) => {
                return res.data;
            });
            return data;
        },
        getHashtaggedImages: (hashtag) => {
            var data = $http.get(`/hashtaggedImages/${hashtag}`).then((res) => {
                return res.data;
            });
            return data;
        },
        getComments: (id) => {
            var data = $http.get(`/comments/${id}`).then((res) => {
                return res.data;
            });
            return data;
        },
        uploadImage: (formData) => {
            return $http({
                url: '/uploadImage',
                method: 'POST',
                data: formData,
                headers: {'Content-Type': undefined},
                transformRequest: angular.identity
            }).then((success) => {
                $("#image").html(`<img src="${success.data.file}">`);
            });
        }
    };
    return factory;
}])

.factory('serviceSocial', ['$http', '$sce', ($http, $sce) => {
    var factory = {
        likeImage: (imageID) => {
            return $http({
                url: `/like/${imageID}`,
                method: 'POST'
            }).then((success) => {
                return success.data.likes;
            });
        },
        addComment: (commentData) => {
            return $http({
                url: '/comment',
                method: 'POST',
                data: $.param(commentData),
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            }).then((success) => {
                return success.data;
            });
        },
        addButtonsForHashtags: (paginatedPhotos) => {
            let paginatedPhotosWithButtons = paginatedPhotos;
            for (let i = 0; i < paginatedPhotosWithButtons.length; i++) {
                var hashtagArray = paginatedPhotosWithButtons[i].description.match(/#\S+/g) || []; //create an array of hashtags from the description of each image
                for (let j = 0; j < hashtagArray.length; j++) {
                    paginatedPhotosWithButtons[i].description = paginatedPhotos[i].description.replace(new RegExp(hashtagArray[j], 'g'), `&nbsp<button class="hashtag" ng-click=searchHashtag("${hashtagArray[j]}")>${hashtagArray[j]}</button>&nbsp`); //add a button element around each hashtag
                }
                paginatedPhotosWithButtons[i].description = $sce.trustAsHtml(paginatedPhotosWithButtons[i].description); //convert string above into html elements
            }
            return paginatedPhotosWithButtons;
        }
    };
    return factory;
}])

.directive('navBar', () => {
    return {
        templateUrl: `/static/views/nav.html`,
        restrict: 'E'
    };
})

.directive('compile', ['$compile', ($compile) => { //compiler required for ng-click directives when converting string to html in adding hashtag button elements
    return (scope, element, attrs) => {
        scope.$watch(
            (scope) => {
                return scope.$eval(attrs.compile);
            },
            (value) => {
                element.html(value);
                $compile(element.contents())(scope);
            }
        );
    };
}])

.config(($stateProvider, $locationProvider) => {
    $locationProvider.html5Mode(true);

    $stateProvider
         .state('home', {
             url: '/',
             views: {
                 'main': {
                     templateUrl: '/static/views/main.html',
                     controller: 'homePageController'
                 }
             }
         })

         .state('uploadImage', {
             url: '/uploadImage',
             views: {
                 'main': {
                     templateUrl: '/static/views/upload.html',
                     controller: 'uploadImageController'
                 }
             }
         })

         .state('singlePhoto', {
             url: '/singlePhoto/:id',
             views: {
                 'main': {
                     templateUrl: '/static/views/single.html',
                     controller: 'singleImageController'
                 }
             }
         });
});
