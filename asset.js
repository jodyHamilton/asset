$(document).ready(function(){
  
  $("#edit-cancel").click(cancelAction);
  //$("#edit-finish").click(insertToEditor);
  $("#edit-aid").change(function(){
    $(".asset-preview").load('/index.php?q=asset/js/preview/'+$(this).val());
  });
  
  initLoader();
});
