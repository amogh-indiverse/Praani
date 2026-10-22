const response=await fetch('https://praani-web.onrender.com/api/health');
console.log('HTTP',response.status);
console.log((await response.text()).slice(0,400));
