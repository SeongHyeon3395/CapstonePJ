import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { askQuestion } from '../api/chatApi';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  articleId: string;
}

export default function ChatModal({ visible, onClose, articleId }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: '지금 보고 있는 기사에 대해서만 질문해 주세요. 기사와 무관한 질문은 답변할 수 없습니다.',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await askQuestion(articleId, inputText);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get answer:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.aiRow]}>
      <View
        style={[
          styles.bubble,
          item.isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text
          style={[styles.bubbleText, item.isUser ? styles.userText : styles.aiText]}
        >
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>기사에 대해 질문하기</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16 }}
          inverted={false}
        />

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#4F46E5" />
            <Text style={styles.loadingText}>AI가 기사 내용을 바탕으로 답변을 작성 중입니다...</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="질문을 입력하세요..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              loading || !inputText.trim() ? styles.sendButtonDisabled : styles.sendButtonEnabled,
            ]}
            onPress={handleSend}
            disabled={loading || !inputText.trim()}
          >
            <Text style={styles.sendButtonText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeText: {
    fontSize: 28,
    color: '#374151',
    lineHeight: 28,
  },
  messageRow: {
    marginBottom: 12,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  aiRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#4F46E5',
  },
  aiBubble: {
    backgroundColor: '#E5E7EB',
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1F2937',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingText: {
    color: '#4B5563',
    fontSize: 13,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: 8,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonEnabled: {
    backgroundColor: '#4F46E5',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
