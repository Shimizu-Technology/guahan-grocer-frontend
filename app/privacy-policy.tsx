import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Guahan Grocer Privacy Policy
        </Text>
        
        <Text style={styles.lastUpdated}>
          Last updated: August 7, 2025
        </Text>
        
        <Text style={styles.sectionTitle}>
          Introduction
        </Text>
        <Text style={styles.paragraph}>
          Guahan Grocer ("we," "our," or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your information when you use our grocery delivery mobile application.
        </Text>
        
        <Text style={styles.sectionTitle}>
          Information We Collect
        </Text>
        <Text style={styles.paragraph}>
          We collect the following types of information to provide our grocery delivery services:
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>• Contact Information: Name, email address, phone number</Text>
          <Text style={styles.bulletPoint}>• Delivery Information: Physical addresses for delivery</Text>
          <Text style={styles.bulletPoint}>• Location Data: Precise location to calculate delivery distances and fees</Text>
          <Text style={styles.bulletPoint}>• Account Information: User ID and account details</Text>
          <Text style={styles.bulletPoint}>• Purchase History: Order details and purchase records</Text>
          <Text style={styles.bulletPoint}>• App Usage: How you interact with our app features</Text>
        </View>
        
        <Text style={styles.sectionTitle}>
          How We Use Your Information
        </Text>
        <Text style={styles.paragraph}>
          We use your information solely for app functionality, including:
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>• Processing and delivering your grocery orders</Text>
          <Text style={styles.bulletPoint}>• Calculating delivery fees and distances</Text>
          <Text style={styles.bulletPoint}>• Communicating about your orders</Text>
          <Text style={styles.bulletPoint}>• Providing customer support</Text>
          <Text style={styles.bulletPoint}>• Improving our app functionality</Text>
        </View>
        
        <Text style={styles.sectionTitle}>
          Information Sharing
        </Text>
        <Text style={styles.paragraph}>
          We do not sell, trade, or share your personal information with third parties for advertising or marketing purposes. We may share information only as necessary to:
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>• Fulfill your grocery orders (with delivery drivers and stores)</Text>
          <Text style={styles.bulletPoint}>• Process payments (with payment processors)</Text>
          <Text style={styles.bulletPoint}>• Comply with legal requirements</Text>
        </View>
        
        <Text style={styles.sectionTitle}>
          Data Security
        </Text>
        <Text style={styles.paragraph}>
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </Text>
        
        <Text style={styles.sectionTitle}>
          Your Rights
        </Text>
        <Text style={styles.paragraph}>
          You have the right to:
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>• Access your personal information</Text>
          <Text style={styles.bulletPoint}>• Update or correct your information</Text>
          <Text style={styles.bulletPoint}>• Delete your account and associated data</Text>
          <Text style={styles.bulletPoint}>• Opt out of non-essential communications</Text>
        </View>
        
        <Text style={styles.sectionTitle}>
          Contact Us
        </Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy, please contact us at:
        </Text>
        <Text style={styles.paragraph}>
          Email: shimizutechnology@gmail.com{'\n'}
          Phone: (671) 483-0218
        </Text>
        
        <Text style={styles.sectionTitle}>
          Changes to This Policy
        </Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy periodically. We will notify you of any significant changes through the app or via email.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    color: '#0F766E',
    marginBottom: 10,
    textAlign: 'center',
  },
  lastUpdated: {
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#0F766E',
    marginTop: 30,
    marginBottom: 15,
  },
  paragraph: {
    lineHeight: 24,
    marginBottom: 15,
  },
  bulletContainer: {
    marginLeft: 10,
    marginBottom: 15,
  },
  bulletPoint: {
    lineHeight: 22,
    marginBottom: 8,
  },
});