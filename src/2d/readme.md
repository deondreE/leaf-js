# 2D rendering

With the potential overhead of memory created by loading of resources separating the Main context from the rendering context seems like the best method in reducing bottle necks and ux issues.

## Main context

On the main context I want to have a data driven design using class instances to represent instances of sprites within a the rendering scope. These instances need to be convertable to a numeric set of values to represent their asset, frame, location,  and size. 

## Rendering Context

The rendering class will act as a delegate to the renderering context. Control of a rendering context of a canvas will be yielded to a dedicated web worker. This web worker will be resposible for storing each asset and using a pipeline to manage sprites states with minimal lookup across the contexts. Additionally A SharedBuffer can then be used to modify the placement of tiles and sprite instances within a scene.

## StaticRendering.
While there is no way to avoid having to redraw static content we can optimize this quite a bit. For now a method to create or add to a static graphic will be provided. In the future I might explore chunking this graphic so larger scenes can be created.
A static image should be able to be provided via a single image or utilize a tileset and be dynamically built. 

## RendereringBuffer
Each instance or item in the buffer is dynamic in a sense that the graphic, animation, currentFrame and repeat can be set.
The current layout idea is something like.

| Label | Type | Description |
|:-----:|:----:|:-----------:|
| AssetIndex | UInt32 | The index of the AnimationFrame or tileset used to render the index. this index will be used to lookup things like frame set and default duration |
| CurrentFrame | UInt32 (could probably be Uint16 or maybe even Uint8) | The index to be used within the current Asset |
| Duration | Int32 | The expected duration of a frame (0xFFFF causes a lookup to apply the animations default duration if none is provided; 0 signifies a static frame which must be manually changed if desired.)  |
| Repeat | UInt16 | The number of times an animation should repeat (0xFF) represents an infinite repeat. |
| x | Uint32 | the x position within the canvas. |
| y | Uint32 | the y position within the canvas. |
| width | the width of the object in the canvas. |
| height | the height of the object in the canvas. |

It is important to note that this Buffer would not be directly accessible to the end developer this buffer would facilitate common operations across contexts. 

## Assets Assets Assets

I use the term assets to describe a few things so going forward I will define more descriptive terms.

| Asset Type | description |
|:----------:|:-----------:|
| Image | Image types such as jpg, png, jpeg, maybe heic and gif as well these types are common asset types when building a 2d rendering system |
| Aseprite | Aseprites contain slices or information in a manner I can infer predefined states and animations. In addition Aseprites can describe both tilesets and tile maps |
| PSD | Completely unsupported at this time. Due to this filetype not being indended for sprites it will require an interface similar to images to slice |
| ImageGrid | Images or parts of images can be sliced into an ImageGrid and each cell can describe frames within a sprite animation or tile set. |
| Sprite | A sprite describes a single element that uses different tiles from an image grid or multiple grids to describe animations frames. In addition information about timing for an enimation should be stored here (easing would be nice). |
| Tileset | A tileset is a grid or grids with a common name. (It should be noted if multiple grids are used they need to use the same tilesize) |
| Tilemap | A tilemap is a method to group tiles by name. |
| AnimationFrame | An optimized sequence of tiles representing the frames of an animation |


## Dealing with images

When consuming an image it seems to be best to use the Image class that imposes automatic caching. I need to provide an interface that allows the developers to define a grid or grids to slice the image by.

```tsx
scene.loadImageAssets('image.png', [
	{
		grid: [3,3],
		//These properties would only be necessary if you wanted to slice a portion of an image asset instead of using its intrinsic size.
		//x:0,
		//y:0,
		//width: 48,
		//height: 48,
		sprites: [...],
		tilesets: [...],
	}
]);
```

Once the grid is defined an array of sprites and tileset can be declared using the indices of the subsequent tilegrid moving from left to right, top to bottom.
|   |   |   |
|:-:|:-:|:-:|
| 0 | 1 | 2 |
| 3 | 4 | 5 |
| 6 | 7 | 8 |

Upon defining a range of ImageGrid indices to represent an animation the animation frames will be reordered to reduce calculations of each frame. 

|   |   |   |   |   |   |   |   |   |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |

in order to reduce the amount of objects being passed around and lookups necessary. (An object lookup is o(log(n)) but an array lookup is o(1))

### Sprites

Sprites are simply an map of different animation frames. Under the hood this is just an array of AnimationFrame indices. However from the end developers side the Sprite will have a list of actions which can be started, stopped or changed by name. 

#### Declaring a sprite
I want to have two methods of doing this. The first method is to use the scene configuration object.
```tsx
window.startScene = function(){
	return {
		assets:{
			"/knight.png":[{
				grid: [3,3],
				sprites: [
					{
						name: "knight",
						idle: {range: [0,2], duration: 100, repeat:0xFF},
						run: {frames: [3,4,5]},
					}
				]
			}],
			/**
			 * It is common sprites will be split over multiple files.
			 * 
			 * And sometimes sprite creators like to label their animations in the image. 
			 */
			"/knightmore.png":[{
				grid: [16,16],
				x: 128,
				y:64,
				width: 256,
				height: 256,
				sprites: [
					{
						name:"knight",
						run: {range:[0,15], duration: 32, repeat: 0xFF},
						jump: {range:[16,31], duration: 32},
						roll: {range: [32, 47] duration: 32},
						dance: {range: [48, 60]}, //during the load process the skipped tiles will be removed unless referenced elsewhere
						backflip: {range: [64, 79]},
						//...
					}
				]
			}],
			//Additionally some asset creators make a master sheet
			[new URL("/master-sheet.png", import.meta.url).toString()]:[
				{
					grid: [16,16],
					width: 256,
					height: 256,
					tilesets: [
						{
							name: "floor-tiles",
							range: [0, 127],
						},
						{
							name: "wall-tiles",
							range: [128, 143],
						},
						{
							name: "wall-torches",
							range: [144,160],
							grouped: 2, //Tiles will be grouped in 2 and this tile cannot be used as a static asset.
						}

					]
				}
			]
		}
	}
}
```

The same object notation can be used via

```tsx
scene.loadImageAssets({...}); //The same notation as above
```


