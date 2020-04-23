$(document).ready(function () {
 $('.login-button').on('click',function () {
     $('.login-tab').css('display','block');
     $('.register-tab').css('display','none');
 });
    $('.register-button').on('click',function () {
        $('.login-tab').css('display','none');
        $('.register-tab').css('display','block');
    });


});
