"use client";

import React, { useState } from "react";
import { Upload, Button, Card, Typography, Alert, Progress, Space, Row, Col, Layout, ConfigProvider, Collapse } from "antd";
import { InboxOutlined, CheckCircleFilled, ExperimentOutlined, InfoCircleOutlined, WarningOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import axios from "axios";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Content } = Layout;
const { Panel } = Collapse;

interface PredictionResult {
  class_name: string;
  confidence: number;
  heatmap_base64: string;
}

const classificationMap: { [key: string]: { name: string; status: string; description: string; color: string } } = {
  "benign_keratosis-like_lesions": { name: "Benign Keratosis-like Lesion", status: "Benign/Normal", description: "Typically non-cancerous skin growth.", color: "#52c41a" },
  "basal_cell_carcinoma": { name: "Basal Cell Carcinoma", status: "Concerning", description: "Common form of skin cancer. Requires medical review.", color: "#faad14" },
  "actinic_keratoses": { name: "Actinic Keratosis", status: "Concerning", description: "Pre-cancerous skin patch. Consult a dermatologist.", color: "#faad14" },
  "vascular_lesions": { name: "Vascular Lesion", status: "Monitor", description: "Related to blood vessels. Professional review recommended.", color: "#1677ff" },
  "melanocytic_nevi": { name: "Melanocytic Nevus", status: "Benign/Normal", description: "Common mole. Typically harmless, but monitor for changes.", color: "#52c41a" },
  "melanoma": { name: "Melanoma", status: "High Risk", description: "Potentially cancerous. Requires immediate professional evaluation.", color: "#ff4d4f" },
  "dermatofibroma": { name: "Dermatofibroma", status: "Benign/Normal", description: "Small, firm bump. Typically harmless.", color: "#52c41a" },
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      setSelectedFile(file as File);
      setPreviewUrl(URL.createObjectURL(file as Blob));
      setResult(null);
      setError(null);
      return false;
    },
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const response = await axios.post<PredictionResult>(
        "https://skin-cancer-api-da8x.onrender.com/predict",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(response.data);
    } catch (err) {
      setError("Unable to connect to the AI backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ token: { borderRadius: 12, colorPrimary: '#00b96b' } }}>
      <Layout style={{ minHeight: "100vh", background: "#f5f7fa" }}>
        <Content style={{ padding: "40px 20px", display: "flex", justifyContent: "center" }}>
          <div style={{ maxWidth: "700px", width: "100%" }}>
            
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <Title level={2} style={{ marginBottom: 8 }}>Skin Cancer Detect</Title>
              <Text type="secondary" style={{ fontSize: "16px" }}>
                AI-powered dermatological triage assistant.
              </Text>
            </div>

            {/* How It Works Section */}
            <Collapse ghost style={{ marginBottom: "24px", background: "#fff", padding: "10px", borderRadius: "12px" }}>
              <Panel header={<Text strong><InfoCircleOutlined /> How does this work?</Text>} key="1">
                <Paragraph type="secondary">
                  1. <strong>Input:</strong> You upload an image of a skin lesion.
                  <br />2. <strong>Analysis:</strong> Our backend uses a <em>Vision Transformer (ViT)</em> model to identify patterns typical of various skin conditions.
                  <br />3. <strong>Localization:</strong> The model generates a <em>Grad-CAM heatmap</em>, which highlights the specific areas of the image that triggered the AI's classification.
                </Paragraph>
              </Panel>
            </Collapse>

            {/* Main Card */}
            <Card variant="borderless" style={{ boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", borderRadius: "20px", padding: "20px" }}>
              {!previewUrl && (
                <Dragger {...uploadProps} style={{ padding: "40px", background: "#fafafa" }}>
                  <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#00b96b' }} /></p>
                  <p className="ant-upload-text">Click or drag image to upload</p>
                </Dragger>
              )}

              {previewUrl && !result && (
                <div style={{ textAlign: "center" }}>
                  <img src={previewUrl} alt="Preview" style={{ maxHeight: "250px", borderRadius: "16px", marginBottom: "20px" }} />
                  <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                    <Button size="large" onClick={() => { setPreviewUrl(null); setSelectedFile(null); }}>Clear</Button>
                    <Button type="primary" size="large" onClick={handleAnalyze} loading={loading}>Analyze Image</Button>
                  </div>
                </div>
              )}
{result && (
  <div>
    {(() => {
      // FORCE lowercase so it matches our classificationMap keys exactly
      const normalizedKey = result.class_name;
      
      const info = classificationMap[normalizedKey] || { 
          name: result.class_name, 
          status: "Information Unavailable", 
          description: "Consult a medical professional for analysis.", 
          color: "#999" 
      };

      return (
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "16px", borderLeft: `6px solid ${info.color}` }}>
              <Text type="secondary" style={{ fontSize: "12px", textTransform: "uppercase" }}>{info.status}</Text>
              <Title level={2} style={{ margin: "4px 0" }}>{info.name}</Title>
              <Paragraph type="secondary" style={{ fontSize: "14px", marginTop: "10px" }}>
                {info.description}
              </Paragraph>
              <Progress percent={Number((result.confidence * 100).toFixed(1))} strokeColor={info.color} />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <img src={`data:image/png;base64,${result.heatmap_base64}`} style={{ width: "100%", borderRadius: "16px" }} alt="Heatmap" />
          </Col>
        </Row>
      );
    })()}
    
    <Button block size="large" style={{ marginTop: "24px" }} onClick={() => {setPreviewUrl(null); setResult(null);}}>Scan New Image</Button>
  </div>
)}
  
            </Card>

            {/* Disclaimer Section */}
            <Alert
              style={{ marginTop: "32px", borderRadius: "12px" }}
              message="Important Medical Disclaimer"
              description="This tool is for educational purposes only and is not a medical device. It does not provide medical diagnoses or treatment. Always consult a board-certified dermatologist for any skin concerns. Do not delay seeking professional medical advice based on the output of this AI model."
              type="warning"
              showIcon
              icon={<WarningOutlined />}
            />

            {/* Footer */}
            <div style={{ textAlign: "center", marginTop: "40px", opacity: 0.6 }}>
              <Text>developed by Leo P.</Text>
            </div>

          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
