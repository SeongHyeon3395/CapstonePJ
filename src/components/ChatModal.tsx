import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { askArticleQuestion } from '../api/newsApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface ChatModalProps {
  articleId: string;
  visible: boolean;
  onClose: () => void;
}

export function ChatModal({ articleId, visible, onClose }: ChatModalProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const submit = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await askArticleQuestion({
        article_id: articleId,
        question: trimmed,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          text: response.answer,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          role: 'assistant',
          text: '질문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>기사 Q&A</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>기사 내용 기반으로 궁금한 점을 물어보세요.</Text>
            ) : (
              messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.bubble,
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      message.role === 'user' ? styles.userText : styles.assistantText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              ))
            )}
            {loading ? <ActivityIndicator size="small" color="#8B2E20" /> : null}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="질문을 입력하세요"
              placeholderTextColor="#7A6F5E"
              value={question}
              onChangeText={setQuestion}
              multiline
            />
            <Pressable style={styles.sendButton} onPress={submit}>
              <Text style={styles.sendText}>전송</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 14, 9, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '84%',
    backgroundColor: '#FCFAF4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D1A15',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B2E20',
  },
  body: {
    flex: 1,
    marginBottom: 12,
  },
  bodyContent: {
    gap: 10,
    paddingBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#5B5447',
    lineHeight: 20,
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '84%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#8B2E20',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECE7D8',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#292318',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    backgroundColor: '#F3EFDE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#1D1A15',
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#8B2E20',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
