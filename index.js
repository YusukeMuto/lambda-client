'use strict';

const execSync = require('child_process').execSync;

const AWS = require('aws-sdk');
AWS.config.loadFromPath( "./.ymuto_config.json" ); 

let lambda = new AWS.Lambda({apiVersion: '2015-03-31'});

let s3 = require( 'ymuto-s3-client' );

exports.updateLambdaCode = ( dirSrc, dirTar, functionName, bucketName, params = {} ) => { 

  let DIR_SRC = dirSrc;
  let DIR_TAR = dirTar;
  let FUNCTION_NAME = functionName;
  let BUCKET_NAME = bucketName;

  let BUCKET_KEY_NAME = DIR_TAR + "/" + FUNCTION_NAME + ".zip";
  let SRC_TO_TAR_FROM = DIR_SRC + '/' + FUNCTION_NAME + ".zip";

  let result =  execSync(' CRD=`pwd`; cd ' + DIR_SRC + '; rm *.zip; zip -r ' + FUNCTION_NAME + ' ./*; cd ${CRD}; mv ' + SRC_TO_TAR_FROM + ' ./' + DIR_TAR + '/; echo "SUCCESS: ' + BUCKET_KEY_NAME + ' CREATED";').toString();
  console.log(result);

  return s3.putObjectFile ( BUCKET_NAME, BUCKET_KEY_NAME, "./" + BUCKET_KEY_NAME ).then( ( v ) => {
    console.log( JSON.stringify( v ) );
    return exports.updateCode( FUNCTION_NAME, BUCKET_NAME, BUCKET_KEY_NAME, params );
  }).then( ( v ) => {
    console.log( JSON.stringify( v ) );
    return Promise.resolve( v );
  });

}



exports.updateCode = ( functionName, s3Bucket, s3Key, params ) =>{
  
  let p = {
    FunctionName: functionName,
    Publish: true, 
    S3Bucket: s3Bucket,
    S3Key: s3Key
  };

  return lambda.updateFunctionCode(p).promise();
};



exports.uploadLambda = ( dirSrc, dirTar, functionName, role, bucketName, params = {} ) => {

  let DIR_SRC = dirSrc;
  let DIR_TAR = dirTar;
  let FUNCTION_NAME = functionName;
  let ROLE = role;
  params.role = ROLE;
  let BUCKET_NAME = bucketName;

  let BUCKET_KEY_NAME = DIR_TAR + "/" + FUNCTION_NAME + ".zip";
  let SRC_TO_TAR_FROM = DIR_SRC + '/' + FUNCTION_NAME + ".zip";

  let result =  execSync(' CRD=`pwd`; cd ' + DIR_SRC + '; rm *.zip; zip -r ' + FUNCTION_NAME + ' ./*; cd ${CRD}; mv ' + SRC_TO_TAR_FROM + ' ./' + DIR_TAR + '/; echo "SUCCESS: ' + BUCKET_KEY_NAME + ' CREATED";').toString();
  console.log(result);

  return s3.putObjectFile ( BUCKET_NAME, BUCKET_KEY_NAME, "./" + BUCKET_KEY_NAME ).then( ( v ) => {
    console.log( JSON.stringify( v ) );
    return exports.create( FUNCTION_NAME, BUCKET_NAME, BUCKET_KEY_NAME, params );
  }).then( ( v ) => {
    console.log( JSON.stringify( v ) );
    return Promise.resolve( v );
  });


}


exports.create = ( functionName, s3Bucket, s3Key, params ) =>{
  
  let description = "default";
  if ( params.description ) {
    description = params.description;
  }

  let handlerFilename = "index";
  if ( params.handlerFilename ) {
    handlerFilename = params.handlerFilename;
  }

  let handlerFunctionName = "handler";
  if ( params.handlerFunctionName ) {
    handlerFunctionName = params.handlerFunctionName;
  }

  let memorySize = 128;
  if ( params.memorySize ) {
    memorySize = params.memorySize;
  }

  let role = "role";
  if ( params.role ) {
    role = params.role;
  }

  let runtime = "nodejs8.10";
  if ( params.runtime ) {
    runtime = params.runtime;
  }

  let timeout = 300;
  if ( params.timeout ) {
    timeout = params.timeout;
  }

  if ( role == "role" ) {
    console.log("ERROR: please set role in params");
    return;
  }

  let p = {
    Code: {
      S3Bucket: s3Bucket,
      S3Key: s3Key
    }, 
    Description: description,
    FunctionName: functionName, 
    Handler: handlerFilename + "." + handlerFunctionName,
    MemorySize: memorySize,
    Publish: true, 
    Role: role,
    Runtime: runtime,
    Timeout: timeout, 
    VpcConfig: {
    }
  };

  return lambda.createFunction( p ).promise().then( ( v ) => {
    console.log( JSON.stringify( v ) );
    return Promise.resolve( v );
  }, ( err ) => {
    console.log( JSON.stringify( err ) );
    return Promise.reject( err );
  });
};