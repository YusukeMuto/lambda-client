'use strict';

const execSync = require('child_process').execSync;

const AWS = require('aws-sdk');
AWS.config.loadFromPath( "./.ymuto_config.json" ); 

let lambda = new AWS.Lambda({apiVersion: '2015-03-31'});
let s3 = require( 'ymuto-s3-client' );

let print = ( val, replacer = null, indent = 2 ) => {
  console.log(JSON.stringify(val, replacer, indent));
};

let _resolve = ( val ) => {
  print( val );
  return Promise.resolve( val );
}
let _reject = ( err ) => {
  print( err );
  return Promise.reject( err );
}


exports.invokePayloadFile = ( FunctionName, versionOrAlias = "$LATEST", filePath = "input.txt" ) => {
  const fs  = require('fs');
  let bodyFile = fs.readFileSync(filePath);

  let p = {
    FunctionName: FunctionName,
    InvocationType: "RequestResponse",
    LogType: "Tail",
    Payload: bodyFile,
    Qualifier: versionOrAlias
  };
  return lambda.invoke(p).promise().then((v)=>{
    v.LogResult = new Buffer(v.LogResult, "base64").toString();
    console.log( "# ------------------------------------" );
    console.log( "# { FUNCTION_NAME : \"" + FunctionName + "\", ALIAS: \"" + versionOrAlias + "\" }");    
    console.log( "# ------------------------------------" );
    console.log(v.LogResult);
    console.log( "# ------------------------------------" );
    return Promise.resolve(v);
  }, _reject);
}

exports.invoke = ( FunctionName, versionOrAlias = "$LATEST", payloadJson = {} ) => {
  let p = {
    FunctionName: FunctionName,
    InvocationType: "RequestResponse",
    LogType: "Tail",
    Payload: JSON.stringify(payloadJson),
    Qualifier: versionOrAlias
  };
  return lambda.invoke(p).promise().then((v)=>{
    v.LogResult = new Buffer(v.LogResult, "base64").toString();
    console.log( "# ------------------------------------" );
    console.log( "# { FUNCTION_NAME : \"" + FunctionName + "\", ALIAS: \"" + versionOrAlias + "\" }");    
    console.log( "# ------------------------------------" );
    console.log(v.LogResult);
    console.log( "# ------------------------------------" );
    return Promise.resolve(v);
  }, _reject);
}

exports.createAlias = ( functionName, aliasName, functionVersion = '$LATEST', description = "no description" ) => {
  let p = {
    FunctionName: functionName,
    FunctionVersion: functionVersion,
    Name: aliasName,
    Description: description
  };

  return lambda.createAlias( p ).promise().then(_resolve, _reject);
}

exports.getAlias = ( functionName, aliasName ) => {
  let p = {
    FunctionName: functionName,
    Name: aliasName
  };
  return lambda.getAlias( p ).promise().then(  ( v ) => {
    print( v );
    return Promise.resolve( v );
  }, _reject);
}

exports.listAliases = ( functionName ) => {
  let p = {
    FunctionName: functionName
  };
  return lambda.listAliases( p ).promise().then(  ( v ) => {
    console.log( "# ------------------------------------" );
    console.log( "# { FUNCTION_NAME : \"" + functionName + "\" }");    
    console.log( "# ------------------------------------" );
    print(v.Aliases, ["Name", "FunctionVersion"], 2);
    console.log( "# ------------------------------------" );

    return Promise.resolve( v );
  }, _reject);
};

exports.listVersions = ( functionName ) => {
  let p = {
    FunctionName: functionName
  };
  return lambda.listVersionsByFunction( p ).promise().then(  ( v ) => {
    console.log( "# ------------------------------------" );
    console.log( "# { FUNCTION_NAME : \"" + functionName + "\" }");
    console.log( "# ------------------------------------" );
    print(v.Versions, ["Version", "LastModified"], 2);
    console.log( "# ------------------------------------" );    
    return Promise.resolve( v );
  }, _reject);
};

exports.publishVersion = ( functionName, description = "from lambda-client" ) => {
  let p = {
    FunctionName: functionName,
    Description: description
  };
  return lambda.publishVersion( p ).promise().then(_resolve, _reject);
}

exports.updateAlias = ( functionName, aliasName, description, functionVersion = "$LATEST" ) => {
  let p = {
    Description: description,
    FunctionName: functionName,
    FunctionVersion: functionVersion,
    Name: aliasName
  };
  return lambda.updateAlias( p ).promise().then(_resolve, _reject);
}


exports.updateFunctionConfiguration = ( functionName, params ) => {
  let p = {
    Description: params.description,
    FunctionName: functionName,
    MemorySize: params.memorySize, 
    Role: params.role,
    Runtime: params.runtime,
    Timeout: params.timeout
  };

  if ( (!!params.handlerFilename) && (!!params.handlerFunctionName) ) {
    p.Handler = params.handlerFilename + "." + params.handlerFunctionName;
  }
  return lambda.updateFunctionConfiguration( p ).promise().then(_resolve, _reject);
}


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
    print( v, null, 2 );    
    return exports.updateCode( FUNCTION_NAME, BUCKET_NAME, BUCKET_KEY_NAME, params );
  }, _reject).then(_resolve, _reject);

}


exports.updateCode = ( functionName, s3Bucket, s3Key, params ) =>{
  
  let p = {
    FunctionName: functionName,
    Publish: false, 
    S3Bucket: s3Bucket,
    S3Key: s3Key
  };

  return lambda.updateFunctionCode( p ).promise().then(_resolve, _reject);
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
    print( v, null, 2 );    
    return exports.create( FUNCTION_NAME, BUCKET_NAME, BUCKET_KEY_NAME, params );
  }, _reject).then(_resolve, _reject);
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
    Publish: false, 
    Role: role,
    Runtime: runtime,
    Timeout: timeout, 
    VpcConfig: {
    }
  };

  return lambda.createFunction( p ).promise().then(_resolve, _reject);
};