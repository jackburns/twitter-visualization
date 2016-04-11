var View = (function () {
  var container;

  var camera, cameraControls, scene, renderer, mesh, id;

  var clock = new THREE.Clock();

  var userPositions = [];

  function init(user, data) {

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);

    container = document.createElement('div');

    container.appendChild(renderer.domElement);
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(1000, 1000, 0);

    cameraControls = new THREE.TrackballControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.maxDistance = 3000;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2( 0x000000, 0.0005 );

  	var ambientLight	= new THREE.AmbientLight( 0x888888 );
  	scene.add( ambientLight );
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight.position.set( 0, 1, 0 );
    scene.add( directionalLight );

    var textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'Anonymous';

    var smallGeometry = new THREE.SphereGeometry(75, 32, 32);
    var mainGeometry = new THREE.SphereGeometry(250, 32, 32);
    var basicMaterial = new THREE.MeshBasicMaterial({
      color: 'white'
    });

    var main;
    // Draw main user
    textureLoader.load(user.profile_image_url, function(texture) {
      var mainMaterial = new THREE.MeshPhongMaterial({
        map: texture
      });
      main = new THREE.Mesh(mainGeometry, mainMaterial);
      main.quaternion.copy(camera.quaternion);
      scene.add(main);
      userPositions.push(main.position);

      for (var i = 0; i < data.length; i++) {
        (function(userData) {
          textureLoader.load(userData.profile_image_url, function(texture) {
            generateSphere(userData, texture);
          });
        })(data[i]);
      }
    });

    var ballTexture = new THREE.TextureLoader().load("/assets/ball.png" );

    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function getUserPosition() {
      var v = new THREE.Vector3(getRandomInt(-1000, 1000), getRandomInt(-1000, 1000), getRandomInt(-1000, 1000));
      var valid = true;
      for(var i = 0; i < userPositions.length; i++) {
        if (Math.abs(v.distanceTo(userPositions[i])) < 200) {
          return getUserPosition();
        }
      }
      return v;
    }
    // Draw other users
    var generateSphere = function (userData, texture) {
      var userMaterial = new THREE.MeshPhongMaterial({
        map: texture
      });
      var user = new THREE.Mesh(smallGeometry, userMaterial);
      user.quaternion.copy(camera.quaternion);

      var posVector = getUserPosition();

      user.position.set(posVector.x, posVector.y, posVector.z);

      userPositions.push(user.position);

      scene.add(user);
      if(userData.from_freq > 0) {
        createLine(main.position, user.position, userData.from_freq);
      }
      if(userData.to_freq > 0) {
        createLine(user.position, main.position, userData.to_freq);
      }
    };

    var createLine = function (v1, v2, freq) {

      var particleGeometry = new THREE.Geometry();

      //First create the line that we want to animate the particles along
      var geometry = new THREE.Geometry();
      geometry.vertices.push(v1);
      geometry.vertices.push(v2);

      var line = new THREE.Line(geometry, basicMaterial);
      var startPoint = line.geometry.vertices[0];
      var endPoint = line.geometry.vertices[1];
      scene.add(line);
      var pMaterial = new THREE.PointsMaterial({
        color: 0x00FF00,
        map: ballTexture,
        size: 30,
        blending: THREE.AdditiveBlending,
        transparent: true
      });
      pMaterial.color.setHSL( 1.0, 0.2, 0.7 );

      //next create a set of about 30 animation points along the line
      var animationPoints = createLinePoints(startPoint, endPoint);

      //add particles to scene
      var numParticles = 4 * freq;
      for (i = 0; i < numParticles; i++) {
        var desiredIndex = i / numParticles * animationPoints.length;
        var rIndex = constrain(Math.floor(desiredIndex), 0, animationPoints.length - 1);
        var particle = animationPoints[rIndex].clone();
        particle.moveIndex = rIndex;
        particle.nextIndex = rIndex + 1;
        if (particle.nextIndex >= animationPoints.length)
          particle.nextIndex = 0;
        particle.lerpN = 0;
        particle.path = animationPoints;
        particleGeometry.vertices.push(particle);
      }


      var particles = new THREE.Points(particleGeometry, pMaterial);
      scene.add(particles);
      particles.update = updateParticles;
    };


    //update function for each particle animation
    var updateParticles = function () {
      // var time = Date.now()
      for (var i in this.geometry.vertices) {
        var particle = this.geometry.vertices[i];
        var path = particle.path;
        particle.lerpN += 0.05;
        if (particle.lerpN > 1) {
          particle.lerpN = 0;
          particle.moveIndex = particle.nextIndex;
          particle.nextIndex++;
          if (particle.nextIndex >= path.length) {
            particle.moveIndex = 0;
            particle.nextIndex = 1;
          }
        }

        var currentPoint = path[particle.moveIndex];
        var nextPoint = path[particle.nextIndex];

        particle.copy(currentPoint);
        particle.lerp(nextPoint, particle.lerpN);
      }
      this.geometry.verticesNeedUpdate = true;
    };

    function createLinePoints(startPoint, endPoint) {
      var numPoints = 30;
      var returnPoints = [];
      for (i = 0; i <= numPoints; i++) {
        var thisPoint = startPoint.clone().lerp(endPoint, i / numPoints);
        returnPoints.push(thisPoint);
      }
      return returnPoints;
    }

    function constrain(v, min, max) {
      if (v < min)
        v = min;
      else
      if (v > max)
        v = max;
      return v;
    }

    window.addEventListener('resize', onWindowResize, false);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();
  }

  function animate() {
    var delta = clock.getDelta();

    id = requestAnimationFrame(animate);

    cameraControls.update(delta);

    for (var i = 0; i < scene.children.length; i++) {
      var child = scene.children[i];
      if (child.type === 'Mesh') {
        child.quaternion.copy(camera.quaternion);
      } else if (child.type === 'Points') {
        child.update();
      }
    }

    renderer.render(scene, camera);
  }

  function clear() {
    console.log('clearing');
    if(id) {
      cancelAnimationFrame( id );
    }
    if(scene) {
      for( var i = scene.children.length - 1; i >= 0; i--) {
        scene.children[i].deallocate();
        scene.children[i].remove();
      }
    }
    userPositions = [];
  }

  return {
    init: init,
    animate: animate,
    clear: clear
  };
}());
