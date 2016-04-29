var View = (function () {
  var container;

  var camera, cameraControls, scene, renderer, mesh, id, wrapper_id, main_id;
  var origin = new THREE.Vector3(0, 1, 0);
  var labels = [];
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();

  var clock = new THREE.Clock();

  var userPositions = [];

  function init() {

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);

    // create three container div and append it to DOM
    container = document.createElement('div');
    container.id = 'content';

    container.appendChild(renderer.domElement);
    document.body.appendChild(container);

    // create camera and camera controls
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(1000, 1000, 0);

    cameraControls = new THREE.TrackballControls(camera, renderer.domElement);
    cameraControls.target.set(0, 0, 0);
    cameraControls.minDistance = 300;
    cameraControls.maxDistance = 3000;

    scene = new THREE.Scene();
    //scene.fog = new THREE.FogExp2( 0x000000, 0.0005 );

    // add some directional lighting to the scene
  	var ambientLight	= new THREE.AmbientLight( 0x888888 );
  	scene.add( ambientLight );
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight.position.set( 0, 1, 0 );
    scene.add( directionalLight );

    // add mouse listener and window resize listener
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousemove', onMouseMove);

    // create the background sphere the camera is placed in
    var wallLoader = new THREE.TextureLoader();
    var sphere = new THREE.Mesh(
      new THREE.SphereGeometry(3000, 32, 32),
      new THREE.MeshBasicMaterial({
        map: wallLoader.load('assets/wallpaper.jpg')
      })
    );

    // invert the sphere so the image is on the inside
    sphere.scale.x = -1;
    scene.add(sphere);
    wrapper_id = sphere.id;
  }

  function displayData(user, data) {
    // create basic geometries, materials, and loader to be used in scene
    var textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'Anonymous';

    var smallGeometry = new THREE.SphereGeometry(75, 32, 32);
    var mainGeometry = new THREE.SphereGeometry(250, 32, 32);
    var basicMaterial = new THREE.MeshBasicMaterial({
      color: 'white'
    });

    var main;
    // First load main user to provide user feedback that something happened
    textureLoader.load(user.profile_image_url, function(texture) {
      var mainMaterial = new THREE.MeshPhongMaterial({
        map: texture
      });
      main = new THREE.Mesh(mainGeometry, mainMaterial);
      main.quaternion.copy(camera.quaternion);
      main.update = updateSphere;
      main.pulseSize = 0;
      scene.add(main);
      userPositions.push(main.position);
      main_id = main.id;

      createPopupLabel('@' + user.username, main.id);
      // load rest of spheres from data
      for (var i = 0; i < data.length; i++) {
        (function(userData) {
          textureLoader.load(userData.profile_image_url, function(texture) {
            generateSphere(userData, texture);
          });
        })(data[i]);
      }
    });

    var blueFlareTexture = new THREE.TextureLoader().load("/assets/lensflare1.png" );
    var orangeFlareTexture = new THREE.TextureLoader().load("/assets/lensflare2.png" );

    // helper to generate an int between min and max values
    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // returns a randomly generated user position that avoids overlaps with other spheres
    function getUserPosition() {
      var v = new THREE.Vector3(getRandomInt(-1000, 1000), getRandomInt(-1000, 1000), getRandomInt(-1000, 1000));
      for(var i = 0; i < userPositions.length; i++) {
        if (Math.abs(v.distanceTo(userPositions[i])) < 500) {
          return getUserPosition();
        }
      }
      return v;
    }
    // Draw other users
    var generateSphere = function (userData, texture) {
      // make image wrap 1.5x across sphere
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1.5, 1);
      var userMaterial = new THREE.MeshPhongMaterial({
        map: texture
      });
      var user = new THREE.Mesh(smallGeometry, userMaterial);
      user.quaternion.copy(camera.quaternion);

      var posVector = getUserPosition();
      user.position.set(posVector.x, posVector.y, posVector.z);
      // set pulse size for sphere based off frequencies
      user.pulseSize = 0.001 * (userData.from_freq + userData.to_freq);

      userPositions.push(user.position);
      user.update = updateSphere;

      scene.add(user);
      createPopupLabel('@' + userData.username, user.id);
      // create blue and orange particles
      if(userData.from_freq > 0) {
        createLine(user.position, main.position, userData.from_freq, blueFlareTexture);
      }
      if(userData.to_freq > 0) {
        createLine(main.position, user.position, userData.to_freq, orangeFlareTexture);
      }
    };
    var once = false;

    // creates a line and particles based off frequencies
    var createLine = function (v1, v2, freq, flareTexture) {

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
        color: 0xFFFFFF,
        map: flareTexture,
        size: Math.random() * (250 - 100) + 100,
        transparent: true,
        depthWrite: false,
        opacity: 0.7
      });
      pMaterial.color.setHSL( 1.0, 0.2, 0.7 );

      // create a set of animation points along the line
      var animationPoints = createLinePoints(startPoint, endPoint);

      // generate and add particles to scene
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

    // update sphere size based off set pulse
    var updateSphere = function() {
      var scale = this.scale.x;
      this.sizeIncreasing ? scale += this.pulseSize : scale -= this.pulseSize;

      if(scale > 1.2) {
        this.sizeIncreasing = false;
      } else if(scale < 0.8) {
        this.sizeIncreasing = true;
      }
      this.scale.x = scale;
      this.scale.y = scale;
      this.scale.z = scale;
    };

    //update a set of particles size and position
    var updateParticles = function () {

      var size = this.material.size;

      // caluclate new size for particle
      this.material.sizeIncreasing ? size += 2 : size -= 2;
      if(size > 250) {
        this.material.sizeIncreasing = false;
      } else if(size < 100) {
        this.material.sizeIncreasing = true;
      }
      this.material.size = size;
      this.material.needsUpdate = true;

      // move particles along path
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

    // create 30 line points to animate particles between
    function createLinePoints(startPoint, endPoint) {
      var numPoints = 30;
      var returnPoints = [];
      for (i = 0; i <= numPoints; i++) {
        var thisPoint = startPoint.clone().lerp(endPoint, i / numPoints);
        returnPoints.push(thisPoint);
      }
      return returnPoints;
    }

    // constrains a value between a min and a max number
    function constrain(v, min, max) {
      if (v < min)
        v = min;
      else if (v > max)
        v = max;
      return v;
    }
  }

  // update camera aspect ratio and rendered size on window resize
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    animate();
  }

  // animation loop
  function animate() {
    var delta = clock.getDelta();

    id = requestAnimationFrame(animate);

    cameraControls.update(delta);

    // generate list of intersected objects with camera raycaster
    raycaster.setFromCamera( mouse, camera );
    var intersects = raycaster.intersectObjects( scene.children );
    var validIntersects = [];
    for(var j = 0; j < intersects.length; j++) {
      if(intersects[j].object.type === 'Mesh' && intersects[j].object.id !== wrapper_id) {
        validIntersects.push(intersects[j].object);
      }
    }

    // update all the scene's children
    for (var i = 0; i < scene.children.length; i++) {
      var child = scene.children[i];
      // exclude wrapper sphere so it doesn't move with the rest of the spheres
      if (child.type === 'Mesh' && child.id !== wrapper_id) {
        hideLabel(child.id);
        // point all but main sphere to look at camera
        if(child.id != main_id) {
          child.up.applyAxisAngle( new THREE.Vector3(0, 1, 0), Math.PI / 2);
          child.lookAt(camera.position);
        }
        child.update();

      } else if (child.type === 'Points') {
        child.update();
      }
    }
    // show first object raycaster intersected with
    if(validIntersects.length > 0) {
      showPopup(validIntersects[0].position, validIntersects[0].id);
    }

    renderer.render(scene, camera);
  }

  // show a popup and update it's position accord to where to the mouse is
  function showPopup(vector, id) {
    var element = labels[id];
    element.css('display', "inline");
    element.css('top', (mouse.yPos) + 'px');
    element.css('left', (mouse.xPos) + 'px');
  }

  // hides a label based off sphere id
  function hideLabel(id) {
    labels[id].css('display', 'none');
  }

  // creates a popup level for a text and sphere id (hidden by default)
  function createPopupLabel(text, id) {
    var element = $('<div class="popup">').appendTo('#content');
    element.html(text);
    element.css('display', 'none');
    labels[id] = element;
  }

  // update mouse object with mouse position
  function onMouseMove( event ) {
    mouse.xPos = event.clientX;
    mouse.yPos = event.clientY;
  }

  // clear the scene of user data
  function clear() {
    console.log('clearing');
    // cancel animation frame if exists
    if(id) {
      cancelAnimationFrame( id );
    }
    console.log(scene);
    // remove certain types of objects from scene
    var clearTypes = ['Mesh', 'Points', 'Line'];
    if(scene) {
      // remove in opposite order to avoid conflicts
      for( var i = scene.children.length - 1; i >= 0; i--) {
        var obj = scene.children[i];
        var type = obj.type;
        // remove object if we can
        if(clearTypes.indexOf(type) !== -1 && obj.id !== wrapper_id) {
          console.log('removing');
          scene.remove(obj);
        }
      }
    }
    userPositions = [];
  }

  return {
    init: init,
    animate: animate,
    clear: clear,
    displayData: displayData
  };
}());
