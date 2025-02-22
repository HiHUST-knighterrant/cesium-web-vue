/*
 * @Date: 2021-06-10 09:13:02
 * @LastEditors: huangzh873
 * @LastEditTime: 2021-06-29 09:08:12
 * @FilePath: \cesium-web-vue\src\utils\vue-utils\transform\transform.ts
 */
import * as Cesium from 'cesium'
import Cartesian3 from 'cesium/Source/Core/Cartesian3';
import Matrix3 from 'cesium/Source/Core/Matrix3';
import Matrix4 from 'cesium/Source/Core/Matrix4';

export default class transform {
  static boundingSphereCenter: Cesium.Cartesian3
  static modelMatrix: Cesium.Matrix4
  constructor(boundingSphereCenter: Cesium.Cartesian3, modelMatrix: Cesium.Matrix4) {
    transform.boundingSphereCenter = boundingSphereCenter;
    transform.modelMatrix = modelMatrix;

  }
  /**
   * @description: 平移
   * @param {number} lng 目标经度
   * @param {number} lat 目标维度
   * @param {number} height 目标高度
   * @return {Cesium.Matrix4} Matrix4矩阵
   */  
  translation(lng:number, lat:number, height:number):Cesium.Matrix4 {
    const cartographic:Cesium.Cartographic = Cesium.Cartographic.fromCartesian(
      transform.boundingSphereCenter
    );
    const surface:Cartesian3 = Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height
    );
    
    const offset:Cartesian3 = Cartesian3.fromDegrees(lng, lat, height);

    const translation:Cartesian3 = Cartesian3.subtract(
      offset,
      surface,
      new Cartesian3()
    );

    // 最终的平移矩阵
    return Matrix4.fromTranslation(
      translation,
      new Matrix4()
    );
  }
  
  /**
   * @description: 旋转
   * @param {number} xAngle 右手坐标系的x, y, z坐标
   * @param {number} yAngle
   * @param {number} zAngle
   * @return {Cesium.Matrix4} 变换后的旋转矩阵
   */  
  rotation(xAngle: number, yAngle:number, zAngle:number):Cesium.Matrix4 {
    const mx: Cesium.Matrix3 = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(xAngle));
    const my: Cesium.Matrix3 = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(yAngle));
    const mz: Cesium.Matrix3 = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(zAngle));

    const m:Cesium.Matrix3 = new Cesium.Matrix3();
    Cesium.Matrix3.multiply(mx, my, m);
    Cesium.Matrix3.multiply(m, mz, m)

    return transform.handleTransform(m)
  }

  static handleTransform(rotateM3: Cesium.Matrix3) {
    const tmp = Cesium.Matrix4.clone(transform.modelMatrix);
    const tilesetMat: Cesium.Matrix4 = Cesium.Matrix4.fromArray(Matrix4.toArray(tmp));
    const tilesetMatRotation: Cesium.Matrix4 = Cesium.Matrix4.getMatrix3(tilesetMat, new Cesium.Matrix3());
    const inverseTilesetMatRotation: Matrix3 = Cesium.Matrix3.inverse(tilesetMatRotation, new Cesium.Matrix3());
    const tilesetMatTranslation: Cartesian3 = Cesium.Matrix4.getTranslation(tilesetMat, new Cesium.Cartesian3())

    // 创建以tileset的中心为原点的坐标系
    const originMat: Matrix4 = Cesium.Transforms.eastNorthUpToFixedFrame(transform.boundingSphereCenter);
    const originMatRotation: Matrix3 = Cesium.Matrix4.getMatrix3(originMat, new Cesium.Matrix3());
    const originMatTranslation: Cartesian3 = Cesium.Matrix4.getTranslation(originMat, new Cesium.Cartesian3());

    const tilesetToOriginTranslation:Matrix4 = Cesium.Matrix4.fromTranslation(
      // 为什么要subtract？
      // tileset减origin得到的矩阵能将模型负向移动origin的偏移量
      Cesium.Cartesian3.subtract(tilesetMatTranslation, originMatTranslation, new Cesium.Cartesian3())
    , new Cesium.Matrix4());

    const tilesetToOriginRotation = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.inverse(
        Cesium.Matrix3.multiply(inverseTilesetMatRotation, originMatRotation, new Cesium.Matrix3())
      , new Cesium.Matrix4())
    )

    const rotateM4:Matrix4 = Cesium.Matrix4.fromRotationTranslation(rotateM3)

    // 转过去
    Cesium.Matrix4.multiply(originMat, rotateM4, originMat);
    // 调整角度
    Cesium.Matrix4.multiply(originMat, tilesetToOriginRotation, originMat);
    // 转回来
    Cesium.Matrix4.multiply(originMat, tilesetToOriginTranslation, originMat);
    
    return originMat
  }
}