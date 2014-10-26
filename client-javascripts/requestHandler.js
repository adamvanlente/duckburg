var dburg = dburg || {};

dburg.ajax = function(url, successCb, errorCb) {
    $.ajax({
       url: url,
       type: 'GET',
       success: function(data){
          successCb(data);
       },
       error: function(err) {
          errorCb(err);
       }
    });
};
