(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.OnPartCheckoutSuccess=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  function begin(manager){
    if(manager&&manager.suppressNextUserNotificationSound) manager.suppressNextUserNotificationSound('order_submitted');
  }

  function cancel(manager){
    if(manager&&manager.clearSuppressedUserNotificationSound) manager.clearSuppressedUserNotificationSound('order_submitted');
  }

  async function complete(manager,orderId,navigate){
    if(manager&&manager.suppressNextUserNotificationSound) manager.suppressNextUserNotificationSound('order_submitted',orderId);
    try{
      if(manager&&manager.playUserNotificationSoundAndWait){
        await manager.playUserNotificationSoundAndWait('order_submitted',{maxWaitMs:45000});
      }
    }catch(_){ }
    navigate('/orders');
  }

  return {begin:begin,cancel:cancel,complete:complete};
});
