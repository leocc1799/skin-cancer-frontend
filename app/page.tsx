"use client";

import React, { useState } from "react";
import { Upload, Button, Card, Typography, Alert, Progress, Space, Row, Col, Layout, ConfigProvider } from "antd";
import { InboxOutlined, CheckCircleFilled, ExperimentOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import axios from "axios";

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Content } = Layout;

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
                Upload a dermoscopic image for AI-powered structural analysis.
              </Text>
            </div>

            {/* Main Card */}
            <Card 
              variant="borderless" 
              style={{ 
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", 
                borderRadius: "20px",
                padding: "20px" 
              }}
            >
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
                   <Row gutter={[24, 24]}>
                      <Col xs={24} md={12}>
                        <div style={{ background: "#f9f9f9", padding: "20px", borderRadius: "16px" }}>
                          <Text type="secondary" style={{ fontSize: "12px", textTransform: "uppercase" }}>Confidence</Text>
                          <Title level={2} style={{ margin: "4px 0" }}>{result.class_name}</Title>
                          <Progress percent={Number((result.confidence * 100).toFixed(1))} />
                        </div>
                      </Col>
                      <Col xs={24} md={12}>
                        <img src={`data:image/png;base64,${result.heatmap_base64}`} style={{ width: "100%", borderRadius: "16px" }} alt="Heatmap" />
                      </Col>
                   </Row>
                   <Button block size="large" style={{ marginTop: "24px" }} onClick={() => {setPreviewUrl(null); setResult(null);}}>Scan New Image</Button>
                </div>
              )}
            </Card>

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
