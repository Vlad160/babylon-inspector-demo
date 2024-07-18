import {
	ArcRotateCamera,
	Color3,
	CubeTexture,
	DirectionalLight,
	Engine,
	MeshBuilder,
	NodeMaterial,
	Scene,
	SceneLoader,
	ShadowGenerator,
	StandardMaterial,
	Texture,
	Tools,
	Vector3
} from "@babylonjs/core";
import "@babylonjs/materials";
import "@babylonjs/loaders";
import "@babylonjs/inspector";

const createScene = async function (engine: Engine, canvas: HTMLCanvasElement) {
	// This creates a basic Babylon Scene object (non-mesh)
	const scene = new Scene(engine);

	// create camera and lights for scene
	const lights = {} as any;
	const env = {} as any;

	async function initScene() {
		const camera = new ArcRotateCamera("camera",
			Tools.ToRadians(0),
			Tools.ToRadians(70),
			0.5,
			new Vector3(0.0, 0.1, 0.0),
			scene);
		camera.minZ = 0.01;
		camera.wheelDeltaPercentage = 0.01;
		camera.upperRadiusLimit = 0.5;
		camera.lowerRadiusLimit = 0.25;
		camera.upperBetaLimit = 1.575;
		camera.lowerBetaLimit = 0;
		camera.panningAxis = new Vector3(0, 0, 0);
		camera.attachControl(canvas, true);

		env.lighting = CubeTexture.CreateFromPrefilteredData(
			"https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/env/hamburg_hbf.env",
			scene);
		env.lighting.name = "hamburg_hbf";
		env.lighting.gammaSpace = false;
		env.lighting.rotationY = Tools.ToRadians(0);
		scene.environmentTexture = env.lighting;

		env.skybox = MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
		env.skyboxMaterial = new StandardMaterial("skyBox", scene);
		env.skyboxMaterial.backFaceCulling = false;
		env.skyboxMaterial.reflectionTexture = new CubeTexture(
			"https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/skybox/hamburg",
			scene);
		env.skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
		env.skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
		env.skyboxMaterial.specularColor = new Color3(0, 0, 0);
		env.skybox.material = env.skyboxMaterial;

		lights.dirLight = new DirectionalLight("dirLight", new Vector3(0.60, -0.7, 0.63), scene);
		lights.dirLight.position = new Vector3(-0.05, 0.35, -0.05);
		lights.dirLight.shadowMaxZ = 0.45;
		lights.dirLight.intensity = 10;
	}

	const bottle = {} as any;
	const table = {} as any;

	async function loadMeshes() {
		bottle.file = await SceneLoader.AppendAsync(
			"https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/sodaBottle.gltf");
		bottle.glass = scene.getMeshByName("sodaBottle_low");
		bottle.liquid = scene.getMeshByName("soda_low");
		bottle.root = bottle.glass.parent;
		bottle.glass.alphaIndex = 2;
		bottle.liquid.alphaIndex = 1;
		bottle.glassLabels = bottle.glass.clone("glassLabels");
		bottle.glassLabels.alphaIndex = 0;
		table.file = await SceneLoader.AppendAsync(
			"https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/table.gltf");
		table.mesh = scene.getMeshByName("table_low");
		bottle.root.position = new Vector3(-0.09, 0.0, -0.09);
		bottle.root.rotation = new Vector3(0.0, 4.0, 0.0);
		lights.dirLight.includedOnlyMeshes.push(table.mesh);
	}

	let loadTexturesAsync = async function () {
		let textures: Texture[] = [];
		return new Promise((resolve) => {
			let textureUrls = [
				"https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/sodaBottleMat_thickness.png",
				"https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/sodaMat_thickness.png",
				"https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/gltf/sodaBottleMat_translucency.png"
			];

			for (let url of textureUrls) {
				textures.push(new Texture(url, scene, false, false));
			}

			whenAllReady(textures, () => resolve(textures));
		}).then(() => {
			assignTextures(textures);
		});
	};

	// test if a texture is loaded
	let whenAllReady = function (textures: Texture[], resolve: () => void) {
		let numRemaining = textures.length;
		if (numRemaining == 0) {
			resolve();
			return;
		}

		for (let i = 0; i < textures.length; i++) {
			let texture = textures[i];
			if (texture.isReady()) {
				if (--numRemaining === 0) {
					resolve();
					return;
				}
			} else {
				let onLoadObservable = texture.onLoadObservable;
				if (onLoadObservable) {
					onLoadObservable.addOnce(() => {
						if (--numRemaining === 0) {
							resolve();
						}
					});
				}
			}
		}
	};

	let retrieveTexture = function (meshMat: string, channel: string, textures: Texture[]) {
		let texture;
		for (let file of textures) {
			let segment = file.name.split("/");
			if (segment[segment.length - 1].split("_")[0] === meshMat) {
				if (segment[segment.length - 1].split("_")[1] === channel + ".png") {
					texture = file;
					return texture;
				}
			}
		}
	};

	const sodaMats = {} as any;
	const bottleTex = {} as any;
	const liquidTex = {} as any;

	function assignTextures(textures: Texture[]) {
		bottleTex.baseColor = bottle.glass.material.albedoTexture;
		bottleTex.orm = bottle.glass.material.metallicTexture;
		bottleTex.normal = bottle.glass.material.bumpTexture;
		bottleTex.thickness = retrieveTexture("sodaBottleMat", "thickness", textures);
		bottleTex.translucency = retrieveTexture("sodaBottleMat", "translucency", textures);
		liquidTex.baseColor = bottle.liquid.material.albedoTexture;
		liquidTex.orm = bottle.liquid.material.metallicTexture;
		liquidTex.normal = bottle.liquid.material.bumpTexture;
		liquidTex.thickness = retrieveTexture("sodaMat", "thickness", textures);

		bottle.glass.material.dispose();
		bottle.liquid.material.dispose();
	}

	NodeMaterial.IgnoreTexturesAtLoadTime = true;
	const bottleParameters = {} as any;
	const liquidParameters = {} as any;

	async function createMaterials() {
		sodaMats.bottle = new NodeMaterial("sodaBottleMat", scene, { emitComments: false });
		await sodaMats.bottle.loadAsync(
			"https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/shaders/glassShader.json");
		sodaMats.bottle.build(false);

		sodaMats.liquid = new NodeMaterial("sodaMat", scene, { emitComments: false });
		await sodaMats.liquid.loadAsync(
			"https://patrickryanms.github.io/BabylonJStextures/Demos/sodaBottle/assets/shaders/sodaShader.json");
		sodaMats.liquid.build(false);

		sodaMats.glassLabels = sodaMats.bottle.clone("glassLabelsMat");

		// get shader parameters
		bottleParameters.baseColor = sodaMats.bottle.getBlockByName("baseColorTex");
		bottleParameters.orm = sodaMats.bottle.getBlockByName("orm");
		bottleParameters.normal = sodaMats.bottle.getBlockByName("normalTex");
		bottleParameters.thickness = sodaMats.bottle.getBlockByName("thicknessTex");
		bottleParameters.maxThickness = sodaMats.bottle.getBlockByName("maxThickness");
		bottleParameters.glassTint = sodaMats.bottle.getBlockByName("glassTint");
		bottleParameters.fresnelColor = sodaMats.bottle.getBlockByName("fresnelColor");
		bottleParameters.translucency = sodaMats.bottle.getBlockByName("refractionInt");
		bottleParameters.glassAlphaSwitch = sodaMats.bottle.getBlockByName("alphaSwitch");
		bottleParameters.pbr = sodaMats.bottle.getBlockByName("PBRMetallicRoughness");

		bottleParameters.labelBaseColor = sodaMats.glassLabels.getBlockByName("baseColorTex");
		bottleParameters.labelOrm = sodaMats.glassLabels.getBlockByName("orm");
		bottleParameters.labelNormal = sodaMats.glassLabels.getBlockByName("normalTex");
		bottleParameters.labelThickness = sodaMats.glassLabels.getBlockByName("thicknessTex");
		bottleParameters.labelMaxThickness = sodaMats.glassLabels.getBlockByName("maxThickness");
		bottleParameters.labelGlassTint = sodaMats.glassLabels.getBlockByName("glassTint");
		bottleParameters.labelFresnelColor = sodaMats.glassLabels.getBlockByName("fresnelColor");
		bottleParameters.labelTranslucency = sodaMats.glassLabels.getBlockByName("refractionInt");
		bottleParameters.labelGlassAlphaSwitch = sodaMats.glassLabels.getBlockByName("alphaSwitch");
		bottleParameters.labelPbr = sodaMats.glassLabels.getBlockByName("PBRMetallicRoughness");

		liquidParameters.maxThickness = sodaMats.liquid.getBlockByName("maxThickness");

		// set up glass rendering parameters
		sodaMats.bottle.getAlphaTestTexture = () => bottleTex.baseColor;
		sodaMats.liquid.getAlphaTestTexture = () => liquidTex.baseColor;
		sodaMats.bottle.needDepthPrePass = true;
		sodaMats.bottle.backFaceCulling = false;
		sodaMats.glassLabels.forceDepthWrite = true;

		// assign textures and baseline shader parameters
		bottle.glass.material = sodaMats.bottle;
		bottle.glassLabels.material = sodaMats.glassLabels;
		bottleParameters.baseColor.texture = bottleParameters.labelBaseColor.texture = bottleTex.baseColor;
		bottleParameters.orm.texture = bottleParameters.labelOrm.texture = bottleTex.orm;
		bottleParameters.normal.texture = bottleParameters.labelNormal.texture = bottleTex.normal;
		bottleParameters.thickness.texture = bottleParameters.labelThickness.texture = bottleTex.thickness;
		bottleParameters.translucency.texture = bottleParameters.labelTranslucency.texture = bottleTex.translucency;
		bottleParameters.pbr.alphaTestCutoff = 0.0;
		bottleParameters.labelPbr.alphaTestCutoff = 0.999;
		bottleParameters.glassAlphaSwitch.value = 0.0;
		bottleParameters.labelGlassAlphaSwitch.value = 1.0;
		bottleParameters.maxThickness.value = bottleParameters.labelMaxThickness.value = 5.0;
		bottleParameters.glassTint.value = bottleParameters.labelGlassTint.value = Color3.FromHexString("#aaaaaa");

		// set up baseline shader parameters for liquid material
		bottle.liquid.material = sodaMats.liquid;
		liquidParameters.maxThickness.value = 1.5;
	}

	const shadows = {} as any;

	function generateShadows() {
		shadows.shadowGenerator = new ShadowGenerator(1024, lights.dirLight);
		shadows.shadowGenerator.useBlurExponentialShadowMap = true;
		shadows.shadowGenerator.blurBoxOffset = 2;
		shadows.shadowGenerator.depthScale = 0;

		shadows.shadowGenerator.addShadowCaster(bottle.glass);
		shadows.shadowGenerator.addShadowCaster(bottle.liquid);

		shadows.shadowGenerator.enableSoftTransparentShadow = true;
		shadows.shadowGenerator.transparencyShadow = true;

		table.mesh.receiveShadows = true;
		table.mesh.material.environmentIntensity = 0.2;
	}

	initScene();
	await loadMeshes();
	await loadTexturesAsync();
	await createMaterials();
	generateShadows();

	return scene;
};

export async function mount(root: Element) {
	const canvas = document.createElement("canvas"); // Get the canvas element
	const engine = new Engine(canvas, true); // Generate the BABYLON 3D engine
	const scene = await createScene(engine, canvas); //Call the createScene function
	engine.runRenderLoop(function () {
		scene.render();
	});
	engine.setSize(window.innerWidth, window.innerHeight);
	root.appendChild(canvas);
	scene.debugLayer.show()

	window.addEventListener("resize", function () {
		engine.resize();
	});
}

