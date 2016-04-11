var App = (function () {


  function init() {

    var getData = function() {
      console.log('hello');
      var input = $('#input').val();
      return $.getJSON('/username/' + input, function(json) {
        if(json.length === 0) {
          $('.error').css('display', 'block');
        } else {
          $('.error').css('display', 'none');
          console.log(json);
          View.init(json.user, json.models);
          View.animate();
        }
      }).fail(function() {
        $('.error').css('display', 'block');
      });
    };

    $('#submit').on('click', getData);

  }

  return {
      init: init
  };
});

$(document).ready(function () {
  App().init();
});
