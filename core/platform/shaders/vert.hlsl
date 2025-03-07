struct VSInput {
    float3 position : POSITION;
    float3 color : COLOR;
};

struct VSOutput {
    float4 position : SV_Position;
    float3 color : COLOR;
};

cbuffer UBO : register(b0) {
    row_major float4x4 model;
    row_major float4x4 view;
    row_major float4x4 proj;
};

VSOutput main(VSInput input) {
    VSOutput output;
    output.position = mul(proj, mul(view, mul(model, float4(input.position, 1.0))));
    output.color = input.color;
    return output;
}
