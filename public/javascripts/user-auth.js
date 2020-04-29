$(document).ready(function () {
 $('.login-button').on('click',function () {
     $('.login-tab').css('display','block');
     $('.register-tab').css('display','none');
 });
    $('.register-button').on('click',function () {
        $('.login-tab').css('display','none');
        $('.register-tab').css('display','block');
    });
    $('.join-button').on('click',function () {
        $('.join-proj-tab').css('display','block');
        $('.create-proj-tab').css('display','none');
    });
    $('.create-proj-button').on('click',function () {
        $('.join-proj-tab').css('display','none');
        $('.create-proj-tab').css('display','block');
    });

});
