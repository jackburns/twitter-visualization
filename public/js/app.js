var App = (function () {
  // initialize Three.js view
  View.init();
  View.animate();

  var getData = function() {
    View.clear();
    console.log('getting data');
    var input = $('#input').val();
    // get twitter models from server
    return $.getJSON('/username/' + input, function(json) {
      if(json.models.length === 0) {
        $('.error').css('display', 'block');
      } else {
        $('.error').css('display', 'none');
        // render the stuff!
        View.displayData(json.user, json.models);
        View.animate();
      }
    }).fail(function() {
      $('.error').css('display', 'block');
    });
  };

  // set submit listener
  function init() {
    $('#submit').on('click', getData);
  }

  return {
      init: init
  };
});

$(document).ready(function () {
  App().init();
});
