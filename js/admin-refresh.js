(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AdminRefreshCoordinator=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function create(run,{delay=250,setTimer=setTimeout,clearTimer=clearTimeout}={}){
    if(typeof run!=='function')throw new TypeError('refresh runner is required');
    let timer=null,inFlight=false,trailing=false,trailingReason='background',destroyed=false,current=Promise.resolve();

    function execute(reason){
      if(destroyed)return Promise.resolve();
      if(inFlight){trailing=true;trailingReason=reason;return current;}
      inFlight=true;
      current=Promise.resolve().then(()=>run(reason)).finally(()=>{
        inFlight=false;
        if(trailing&&!destroyed){
          const nextReason=trailingReason;
          trailing=false;
          trailingReason='background';
          request(nextReason);
        }
      });
      return current;
    }

    function request(reason='background',{immediate=false}={}){
      if(destroyed)return Promise.resolve();
      if(inFlight){trailing=true;trailingReason=reason;return current;}
      if(timer!==null){clearTimer(timer);timer=null;}
      if(immediate)return execute(reason);
      timer=setTimer(()=>{timer=null;execute(reason);},delay);
      return current;
    }

    function destroy(){
      destroyed=true;trailing=false;
      if(timer!==null){clearTimer(timer);timer=null;}
    }

    return {request,destroy,isInFlight:()=>inFlight};
  }
  return {create};
});