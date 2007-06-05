$(document).ready(function(){

  $('.messages').each(function(){
    $('<a class="okay">Okay</a>')
      .prependTo(this)
      .click(function(){
        $(this).parent().slideUp('slow');
        return false;
      });
  });
  
  $("#edit-cancel").click(cancelAction);
  //$("#edit-finish").click(insertToEditor);
  $("#edit-aid").change(function(){
    $(".asset-preview").load('/index.php?q=asset/js/preview/'+$(this).val());
  });
  
  // replace buttons with links for better styling
  $("#asset-popup-footer input[@type=submit]").each(function(){
    var button = this;
    var html = '<a class="button-replacement" id="button-' + button.id + '" href="#"><span>' + button.value + '</span></a>';
    $(html).prependTo($("#asset-popup-footer")).click(function(){
      $("#asset-wizard-form").append('<input type="hidden" name="op" value="' + button.value + '" />');
      $("#asset-wizard-form")[0].submit();
      return false;
    });
    $(button).hide();
  });
  
  if($("#edit-folder").length){
    $("#edit-folder").val($("#edit-folder")[0].alt).focus(function(){
      $(this).val('');
      $(this).unbind('focus');
    });
  }
  
  $("#button-edit-cancel").click(cancelAction);
  $("#button-edit-cancel span").html($("#edit-cancel")[0].alt);
  
  initLoader();
});
