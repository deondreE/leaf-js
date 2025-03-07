struct FSInput {
    float4 position : SV_Position;
    float3 color : COLOR;
};

float4 main(FSInput input) : SV_Target {
    return float4(input.color, 1.0);
}
