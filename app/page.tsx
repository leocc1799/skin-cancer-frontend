"use client";

import React, { useState } from "react";
import { Upload, Button, Card, Typography, Alert, Progress, Space, Row, Col, Layout } from "antd";
import { InboxOutlined, SyncOutlined, CheckCircleFilled, ExperimentOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import axios from "axios";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Content } = Layout;

// Define the shape of our expected FastAPI response
interface PredictionResult {
  class_name: string;
  confidence: number;
  heatmap_base64: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Configure Ant Design Upload component properties
  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      setSelectedFile(file as File);
      setPreviewUrl(URL.createObjectURL(file as Blob));
      setResult(null);
      setError(null);
      return false; // Crucial: Stops Ant Design from uploading automatically
    },
  };

  // Sends the image file to the Python FastAPI backend
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Connects to your local or hosted FastAPI backend endpoint
      const response = await axios.post<PredictionResult>(
        "https://skin-cancer-api-da8x.onrender.com/predict",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResult(response.data);
    } catch (err) {
      setError("Unable to connect to the AI backend. Make sure your FastAPI server is active.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Resets the interface state back to default
  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <Content style={{ padding: "50px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "800px", width: "100%" }}>

        {/* Header Branding */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          {/* UPDATED: direction -> orientation */}
          <Space orientation="vertical" size="small">
            <Text type="secondary" strong>
              <ExperimentOutlined /> DEEP LEARNING SCREENING DEMO
            </Text>
            <Title level={2} style={{ margin: 0 }}>Skin Lesion AI Classifier</Title>
            <Paragraph type="secondary">
              Upload a clear dermoscopic image of a skin lesion to generate a structural classification and an explainable Grad-CAM heatmap.
            </Paragraph>
            {/* UPDATED: message -> title */}
            <Alert
              title={<b>Educational Demo Only</b>}
              description="This tool does not replace professional medical evaluations."
              type="warning"
              showIcon
              style={{ textAlign: "left", marginTop: "10px" }}
            />
          </Space>
        </div>

        {/* Main Interface Wrapper */}
        {/* UPDATED: bordered={false} -> variant="borderless" */}
        <Card variant="borderless" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)", borderRadius: "12px" }}>

          {/* Step 1: Drag and Drop Upload Dropzone */}
          {!previewUrl && (
            <Dragger {...uploadProps} style={{ padding: "40px 0" }}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#1677ff' }} />
              </p>
              <p className="ant-upload-text">Click or drag image to this area to upload</p>
              <p className="ant-upload-hint">Supports JPG, PNG, or TIFF formats.</p>
            </Dragger>
          )}

          {/* Step 2: Image Preview and Submission State */}
          {previewUrl && !result && (
            <div style={{ textAlign: "center" }}>
              <img
                src={previewUrl}
                alt="Target lesion preview"
                style={{ maxHeight: "300px", maxWidth: "100%", objectFit: "contain", borderRadius: "8px", border: "1px solid #d9d9d9" }}
              />
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "center", gap: "12px" }}>
                <Button onClick={resetForm} disabled={loading}>
                  Clear
                </Button>
                <Button
                  type="primary"
                  onClick={handleAnalyze}
                  loading={loading}
                  icon={loading ? <SyncOutlined spin /> : null}
                >
                  {loading ? "Analyzing Image..." : "Compute Prediction"}
                </Button>
              </div>
            </div>
          )}

          {/* System Connection Errors */}
          {/* UPDATED: message -> title */}
          {error && (
            <Alert title="Connection Error" description={error} type="error" showIcon style={{ marginTop: "24px" }} />
          )}

          {/* Step 3: Server Metrics Visualization Panel */}
          {result && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #f0f0f0" }}>
                <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                  <CheckCircleFilled /> Evaluation Complete
                </Title>
                <Button type="link" onClick={resetForm}>
                  Test another image
                </Button>
              </div>

              <Row gutter={[32, 32]} align="middle">
                {/* Categorical & Percentage Readout */}
                <Col xs={24} md={12}>
                  {/* UPDATED: bordered -> variant="outlined" */}
                  <Card type="inner" title="Algorithmic Confidence" variant="outlined" style={{ backgroundColor: "#fafafa" }}>
                    <Text type="secondary" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
                      Detected Class Target
                    </Text>
                    <Title level={3} style={{ marginTop: 0 }}>{result.class_name}</Title>

                    <Text type="secondary" style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", display: 'block', marginTop: '16px', marginBottom: '8px' }}>
                      Model Confidence
                    </Text>
                    <Progress
                      percent={Number((result.confidence * 100).toFixed(1))}
                      status="active"
                      strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
                    />
                  </Card>
                </Col>

                {/* Explainable AI Heatmap Renderer */}
                <Col xs={24} md={12} style={{ textAlign: "center" }}>
                  <img
                    src={`data:image/png;base64,${result.heatmap_base64}`}
                    alt="Grad-CAM spatial localization model heat-map"
                    style={{ maxHeight: "250px", maxWidth: "100%", borderRadius: "8px", border: "1px solid #d9d9d9" }}
                  />
                  <Text type="secondary" style={{ display: "block", marginTop: "12px", fontSize: "12px" }}>
                    Grad-CAM Spatial Layer Heatmap Activation
                  </Text>
                </Col>
              </Row>
            </div>
          )}
        </Card>
      </div>
    </Content>
  );
}
